import { configurePdfjs } from './pdfjsSetup';
import { readFileAsArrayBuffer } from '../fileValidator';
import { OcrLanguage, recognizeImageSource } from './ocrService';
import { calculateWordCount } from './imageToTextEngine';

export type PdfExtractionMode = 'auto' | 'digital' | 'ocr';

export interface PdfToTextOptions {
  mode?: PdfExtractionMode;
  lang?: OcrLanguage;
  pageRange?: string; // e.g. 'all', '1-5', '1,3,5'
  onProgress?: (percent: number, message: string) => void;
  outputFileName?: string;
}

export interface PdfPageTextResult {
  pageNumber: number;
  text: string;
  method: 'digital' | 'ocr';
  wordCount: number;
  charCount: number;
}

export interface PdfToTextResult {
  text: string;
  wordCount: number;
  charCount: number;
  totalPages: number;
  processedPages: number[];
  method: 'digital' | 'ocr' | 'hybrid';
  pageResults: PdfPageTextResult[];
  blob: Blob;
  url: string;
  fileName: string;
}

/**
 * Parses user-supplied page range strings like 'all', '1-5', '1, 3, 5'.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/);

  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          pages.add(p);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum);
      }
    }
  }

  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i + 1);
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Reconstructs clean lines and paragraphs from PDF.js raw text content items.
 */
function extractDigitalTextFromPageItems(items: any[]): string {
  const textItems: RawTextItem[] = [];

  for (const item of items) {
    if (item && typeof item.str === 'string' && item.str.trim()) {
      const x = item.transform ? item.transform[4] : 0;
      const y = item.transform ? item.transform[5] : 0;
      textItems.push({ str: item.str, x, y });
    }
  }

  if (textItems.length === 0) return '';

  // Sort descending by y (top to bottom), then ascending by x (left to right)
  textItems.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 3.5) return yDiff;
    return a.x - b.x;
  });

  const lines: string[] = [];
  let currentLineY: number | null = null;
  let currentLineItems: string[] = [];

  for (const item of textItems) {
    if (currentLineY === null || Math.abs(currentLineY - item.y) > 3.5) {
      if (currentLineItems.length > 0) {
        lines.push(currentLineItems.join(' ').trim());
      }
      currentLineY = item.y;
      currentLineItems = [item.str];
    } else {
      currentLineItems.push(item.str);
    }
  }

  if (currentLineItems.length > 0) {
    lines.push(currentLineItems.join(' ').trim());
  }

  return lines.join('\n');
}

/**
 * Extracts text from a PDF document using direct digital extraction or OCR.
 */
export async function extractTextFromPdf(
  file: File,
  options: PdfToTextOptions = {}
): Promise<PdfToTextResult> {
  const {
    mode = 'auto',
    lang = 'eng',
    pageRange = 'all',
    onProgress,
    outputFileName,
  } = options;

  onProgress?.(5, 'Loading PDF parser...');

  const pdfjs = configurePdfjs();
  const arrayBuffer = await readFileAsArrayBuffer(file);

  // Validate PDF header magic bytes
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const header = String.fromCharCode(...headerBytes);
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
        `File "${file.name}" is password-protected. Please unlock the file before extracting text.`
      );
    }
    throw new Error(`Failed to parse PDF "${file.name}": ${msg}`);
  }

  const totalPages = pdfDoc.numPages;
  if (totalPages === 0) {
    throw new Error(`Document "${file.name}" contains 0 pages.`);
  }

  const pagesToProcess = parsePageRange(pageRange, totalPages);
  const pageResults: PdfPageTextResult[] = [];
  let usedOcr = false;
  let usedDigital = false;

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d');

  for (let idx = 0; idx < pagesToProcess.length; idx++) {
    const pageNum = pagesToProcess[idx];
    const baseProgress = Math.round(10 + (idx / pagesToProcess.length) * 85);
    const progressSpan = Math.round(85 / pagesToProcess.length);

    onProgress?.(
      baseProgress,
      `Inspecting page ${pageNum} of ${totalPages} (${idx + 1}/${pagesToProcess.length})...`
    );

    const page = await pdfDoc.getPage(pageNum);

    let pageText = '';
    let methodUsed: 'digital' | 'ocr' = 'digital';

    if (mode === 'ocr') {
      // Forced OCR mode
      methodUsed = 'ocr';
    } else {
      // Check digital text
      const content = await page.getTextContent();
      const rawDigital = extractDigitalTextFromPageItems(content.items);

      if (mode === 'digital' || rawDigital.length > 15) {
        pageText = rawDigital;
        methodUsed = 'digital';
      } else {
        // Scanned page fallback in 'auto' mode
        methodUsed = 'ocr';
      }
    }

    if (methodUsed === 'ocr') {
      usedOcr = true;
      if (!canvas || !ctx) {
        throw new Error('Canvas 2D context is required for OCR rendering.');
      }

      onProgress?.(
        baseProgress + 2,
        `Rendering page ${pageNum} to canvas for OCR...`
      );

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      pageText = await recognizeImageSource(canvas, lang, (p) => {
        const subPercent = Math.min(
          99,
          Math.round(baseProgress + p.progress * progressSpan)
        );
        onProgress?.(
          subPercent,
          `Page ${pageNum} OCR: ${p.status || 'Recognizing'} (${Math.round(
            p.progress * 100
          )}%)`
        );
      });
    } else {
      usedDigital = true;
    }

    const cleanText = pageText.trim();
    pageResults.push({
      pageNumber: pageNum,
      text: cleanText,
      method: methodUsed,
      wordCount: calculateWordCount(cleanText),
      charCount: cleanText.length,
    });
  }

  let overallMethod: 'digital' | 'ocr' | 'hybrid' = 'digital';
  if (usedOcr && usedDigital) {
    overallMethod = 'hybrid';
  } else if (usedOcr) {
    overallMethod = 'ocr';
  }

  // Format combined text
  let combinedText = '';
  if (pageResults.length === 1) {
    combinedText = pageResults[0].text;
  } else {
    combinedText = pageResults
      .map((res) => `--- Page ${res.pageNumber} ---\n\n${res.text}`)
      .join('\n\n\n');
  }

  const totalWords = calculateWordCount(combinedText);
  const totalChars = combinedText.length;

  const blob = new Blob(['\uFEFF' + combinedText], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);

  const defaultName = `${file.name.replace(/\.[^.]+$/, '')}-text.txt`;

  onProgress?.(100, 'Text extraction complete.');

  return {
    text: combinedText,
    wordCount: totalWords,
    charCount: totalChars,
    totalPages,
    processedPages: pagesToProcess,
    method: overallMethod,
    pageResults,
    blob,
    url,
    fileName: outputFileName || defaultName,
  };
}
