import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../fileValidator';

export interface MergePdfResult {
  blob: Blob;
  url: string;
  pageCount: number;
  byteSize: number;
  fileName: string;
}

export interface MergePdfOptions {
  onProgress?: (percent: number, currentFileName: string) => void;
  outputFileName?: string;
}

export async function mergePdfFiles(
  files: File[],
  options: MergePdfOptions = {}
): Promise<MergePdfResult> {
  if (!files || files.length === 0) {
    throw new Error('At least one PDF file is required to merge.');
  }

  const { onProgress, outputFileName = 'combined-document.pdf' } = options;

  onProgress?.(5, 'Initializing PDF engine...');

  const mergedDoc = await PDFDocument.create();
  let totalInputPages = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(
      Math.round(10 + (i / files.length) * 80),
      `Reading page streams from ${file.name}...`
    );

    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await readFileAsArrayBuffer(file);
    } catch {
      throw new Error(`Failed to read bytes from file "${file.name}".`);
    }

    // Check magic bytes for PDF
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
    const header = String.fromCharCode(...headerBytes);
    if (!header.startsWith('%PDF-')) {
      throw new Error(
        `File "${file.name}" is corrupted or is not a valid PDF document (missing %PDF- header).`
      );
    }

    let sourceDoc: PDFDocument;
    try {
      sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
        throw new Error(
          `File "${file.name}" is password-protected. Please unlock the file before combining.`
        );
      }
      throw new Error(`Failed to parse PDF "${file.name}": ${msg}`);
    }

    if (sourceDoc.isEncrypted) {
      throw new Error(
        `File "${file.name}" is password-protected and cannot be combined without authentication.`
      );
    }

    const pageCount = sourceDoc.getPageCount();
    if (pageCount === 0) {
      throw new Error(`File "${file.name}" has 0 pages and cannot be merged.`);
    }

    totalInputPages += pageCount;

    const pageIndices = sourceDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  onProgress?.(92, 'Validating and serializing combined document...');

  const mergedPdfBytes = await mergedDoc.save({ useObjectStreams: true });

  // Output validation
  if (mergedPdfBytes.length === 0) {
    throw new Error('Generated PDF byte stream is empty.');
  }

  const outHeader = String.fromCharCode(...mergedPdfBytes.slice(0, 5));
  if (!outHeader.startsWith('%PDF-')) {
    throw new Error('Output validation failed: generated file is missing valid PDF signature.');
  }

  if (mergedDoc.getPageCount() !== totalInputPages) {
    throw new Error(
      `Page count mismatch: expected ${totalInputPages} pages, but merged document contains ${mergedDoc.getPageCount()}.`
    );
  }

  onProgress?.(100, 'Complete!');

  const blob = new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    pageCount: mergedDoc.getPageCount(),
    byteSize: mergedPdfBytes.length,
    fileName: outputFileName.endsWith('.pdf') ? outputFileName : `${outputFileName}.pdf`,
  };
}
