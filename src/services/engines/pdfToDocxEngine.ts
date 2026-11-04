import { configurePdfjs } from './pdfjsSetup';
import { readFileAsArrayBuffer } from '../fileValidator';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import JSZip from 'jszip';

export interface PdfToDocxOptions {
  onProgress?: (percent: number, message: string) => void;
  outputFileName?: string;
}

export interface PdfToDocxResult {
  blob: Blob;
  url: string;
  byteSize: number;
  fileName: string;
  pageCount: number;
  extractedCharCount: number;
  isProbableScanned: boolean;
  warningMessage?: string | null;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

interface TextLine {
  y: number;
  fontSize: number;
  items: RawTextItem[];
  fullText: string;
}

/**
 * Extracts and reconstructs text flow from a single PDF page into docx elements.
 */
function reconstructPageElements(
  textItems: RawTextItem[]
): (Paragraph | Table)[] {
  if (textItems.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: '', break: 1 })] })];
  }

  // Group items into horizontal lines (in PDF coordinates, y=0 is at bottom, so higher y = higher on page)
  // Sort descending by y (top to bottom)
  const sortedItems = [...textItems].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3.5) {
      return yDiff;
    }
    return a.x - b.x; // left to right on same line
  });

  const lines: TextLine[] = [];
  let currentLine: TextLine | null = null;

  for (const item of sortedItems) {
    if (!item.str.trim()) continue;

    if (!currentLine || Math.abs(currentLine.y - item.y) > 3.5) {
      if (currentLine) {
        currentLine.fullText = currentLine.items.map((i) => i.str).join(' ').trim();
        lines.push(currentLine);
      }
      currentLine = {
        y: item.y,
        fontSize: item.fontSize,
        items: [item],
        fullText: '',
      };
    } else {
      currentLine.items.push(item);
      currentLine.fontSize = Math.max(currentLine.fontSize, item.fontSize);
    }
  }

  if (currentLine && currentLine.items.length > 0) {
    currentLine.fullText = currentLine.items.map((i) => i.str).join(' ').trim();
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return [new Paragraph({ children: [new TextRun('')] })];
  }

  // Calculate median font size to estimate headings
  const fontSizes = lines.map((l) => l.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 11;

  const elements: (Paragraph | Table)[] = [];
  let paragraphBuffer: TextRun[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      elements.push(
        new Paragraph({
          children: [...paragraphBuffer],
          spacing: { after: 120, line: 276 },
        })
      );
      paragraphBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : null;

    // Table detection heuristic:
    // If a line has 2+ items separated by significant horizontal gaps (>35pt)
    const isTabular =
      line.items.length >= 2 &&
      line.items.some((it, idx) => idx > 0 && it.x - (line.items[idx - 1].x + line.items[idx - 1].width) > 30);

    if (isTabular) {
      flushParagraph();
      const rowCells = line.items.map(
        (cellItem) =>
          new TableCell({
            width: { size: 100 / line.items.length, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellItem.str.trim(),
                    size: Math.round(cellItem.fontSize * 2),
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          })
      );

      elements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: rowCells })],
        })
      );
      continue;
    }

    // Heading detection: font size noticeably larger than median
    const isHeading = line.fontSize >= medianFontSize * 1.3 || line.fontSize >= 15;

    if (isHeading) {
      flushParagraph();
      elements.push(
        new Paragraph({
          heading: line.fontSize >= 18 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: line.fullText,
              bold: true,
              size: Math.round(line.fontSize * 2),
            }),
          ],
        })
      );
      continue;
    }

    // Paragraph boundary check: vertical gap between lines > 1.8x line height
    if (prevLine && Math.abs(prevLine.y - line.y) > line.fontSize * 1.8) {
      flushParagraph();
    }

    paragraphBuffer.push(
      new TextRun({
        text: paragraphBuffer.length > 0 ? ' ' + line.fullText : line.fullText,
        size: Math.round(line.fontSize * 2),
      })
    );
  }

  flushParagraph();
  return elements;
}

/**
 * Main PDF to DOCX Conversion Engine
 */
export async function convertPdfToDocx(
  file: File,
  options: PdfToDocxOptions = {}
): Promise<PdfToDocxResult> {
  const {
    outputFileName = file.name.replace(/\.[^.]+$/, '') + '.docx',
    onProgress,
  } = options;

  onProgress?.(5, 'Loading PDF.js extraction engine...');
  const pdfjs = configurePdfjs();
  const arrayBuffer = await readFileAsArrayBuffer(file);

  // Validate PDF header
  const header = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
  if (!header.startsWith('%PDF-')) {
    throw new Error(
      `File "${file.name}" is corrupted or is not a valid PDF document (missing %PDF- header).`
    );
  }

  let pdfDoc;
  try {
    pdfDoc = await pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    }).promise;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
      throw new Error(
        `File "${file.name}" is password-protected. Please unlock the file before converting to DOCX.`
      );
    }
    throw new Error(`Failed to parse PDF "${file.name}": ${msg}`);
  }

  const numPages = pdfDoc.numPages;
  if (numPages === 0) {
    throw new Error(`Document "${file.name}" contains 0 pages.`);
  }

  let totalExtractedChars = 0;
  const docxSectionsChildren: (Paragraph | Table)[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(
      Math.round(10 + ((pageNum - 1) / numPages) * 70),
      `Extracting text layout from page ${pageNum} of ${numPages}...`
    );

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rawItems: RawTextItem[] = [];

    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string') {
        const text = item.str;
        totalExtractedChars += text.trim().length;

        const transform = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
        const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) || 11;

        rawItems.push({
          str: text,
          x: transform[4],
          y: transform[5],
          width: item.width || 0,
          height: item.height || fontSize,
          fontSize,
          fontName: item.fontName || 'Helvetica',
        });
      }
    }

    const pageElements = reconstructPageElements(rawItems);
    docxSectionsChildren.push(...pageElements);

    // Insert page break between pages (except last)
    if (pageNum < numPages) {
      docxSectionsChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
        })
      );
    }

    page.cleanup();
  }

  onProgress?.(85, 'Assembling OpenXML DOCX document...');

  // Heuristic for scanned document detection
  const avgCharsPerPage = totalExtractedChars / numPages;
  const isProbableScanned = avgCharsPerPage < 15;
  let warningMessage: string | null = null;

  if (isProbableScanned) {
    warningMessage =
      'This document contains minimal or no extractable digital text and appears to be a scanned image. An OCR (Optical Character Recognition) pipeline is required for full text recovery.';
  }

  const doc = new Document({
    creator: 'DocuMorph PDF-to-Word Converter',
    description: `Converted from ${file.name}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    sections: [
      {
        properties: {},
        children: docxSectionsChildren,
      },
    ],
  });

  onProgress?.(92, 'Packaging ZIP archive...');
  const docxBlob = await Packer.toBlob(doc);

  // Validate DOCX OpenXML package structure
  const zip = await JSZip.loadAsync(await docxBlob.arrayBuffer());
  const filesInZip = Object.keys(zip.files);
  const hasDocumentXml = filesInZip.includes('word/document.xml');
  const hasContentTypes = filesInZip.includes('[Content_Types].xml');

  if (!hasDocumentXml || !hasContentTypes) {
    throw new Error('Generated DOCX package failed OpenXML package integrity validation.');
  }

  onProgress?.(100, 'Complete!');

  const url = URL.createObjectURL(docxBlob);

  return {
    blob: docxBlob,
    url,
    byteSize: docxBlob.size,
    fileName: outputFileName,
    pageCount: numPages,
    extractedCharCount: totalExtractedChars,
    isProbableScanned,
    warningMessage,
  };
}
