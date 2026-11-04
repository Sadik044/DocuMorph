import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../fileValidator';
import { configurePdfjs } from './pdfjsSetup';

export type CompressionLevel = 'lossless' | 'balanced' | 'strong';

export interface CompressPdfOptions {
  level?: CompressionLevel;
  onProgress?: (percent: number, message: string) => void;
  outputFileName?: string;
}

export interface CompressPdfResult {
  blob: Blob;
  url: string;
  originalBytes: number;
  outputBytes: number;
  reductionBytes: number;
  reductionPercent: number;
  isReductionAchieved: boolean;
  pageCount: number;
  level: CompressionLevel;
  fileName: string;
}

/**
 * Structural & Object Stream Compression (Lossless).
 * Re-serializes the document into compressed object streams, compacting dictionaries
 * and removing unused cross-reference gaps without modifying visual contents.
 */
async function compressStructural(
  arrayBuffer: ArrayBuffer,
  onProgress?: (percent: number, message: string) => void
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  onProgress?.(25, 'Loading PDF structure...');
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  if (pdfDoc.isEncrypted) {
    throw new Error(
      'Document is password-protected. Please unlock the file before compressing.'
    );
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('Document contains 0 pages.');
  }

  onProgress?.(50, 'Compacting cross-reference table and object streams...');

  // Save with object streams enabled
  const optimizedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  return { bytes: optimizedBytes, pageCount };
}

/**
 * Lossy Image Recompression (Strong).
 * For scanned or image-heavy PDFs, re-renders pages at controlled DPI and image quality,
 * rebuilding a new compact PDF.
 */
async function compressLossyRaster(
  arrayBuffer: ArrayBuffer,
  quality: number,
  scale: number,
  onProgress?: (percent: number, message: string) => void
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const pdfjs = configurePdfjs();
  onProgress?.(15, 'Inspecting page raster streams...');

  const pdfDoc = await pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  }).promise;

  const totalPages = pdfDoc.numPages;
  const targetDoc = await PDFDocument.create();

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d');

  if (!canvas || !ctx) {
    throw new Error('Canvas context is required for lossy raster compression.');
  }

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(
      Math.round(20 + ((pageNum - 1) / totalPages) * 70),
      `Optimizing page ${pageNum} of ${totalPages}...`
    );

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const imgBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to compress page ${pageNum}`));
        },
        'image/jpeg',
        quality
      );
    });

    const imgBytes = new Uint8Array(await imgBlob.arrayBuffer());
    const embeddedImg = await targetDoc.embedJpg(imgBytes);

    const newPage = targetDoc.addPage([viewport.width / scale, viewport.height / scale]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: newPage.getWidth(),
      height: newPage.getHeight(),
    });

    page.cleanup();
  }

  canvas.width = 0;
  canvas.height = 0;

  onProgress?.(92, 'Finalizing compressed document...');
  const finalBytes = await targetDoc.save({ useObjectStreams: true });
  return { bytes: finalBytes, pageCount: totalPages };
}

/**
 * Main PDF Compression Engine
 */
export async function compressPdfFile(
  file: File,
  options: CompressPdfOptions = {}
): Promise<CompressPdfResult> {
  const {
    level = 'balanced',
    onProgress,
    outputFileName = file.name.replace(/\.[^.]+$/, '') + '-compressed.pdf',
  } = options;

  onProgress?.(5, 'Reading document bytes...');
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const originalBytes = arrayBuffer.byteLength;

  if (originalBytes === 0) {
    throw new Error(`File "${file.name}" is empty (0 bytes).`);
  }

  // Validate PDF signature
  const header = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
  if (!header.startsWith('%PDF-')) {
    throw new Error(
      `File "${file.name}" is corrupted or is not a valid PDF document (missing %PDF- header).`
    );
  }

  let compressedBytes: Uint8Array;
  let pageCount: number;

  if (level === 'strong') {
    // Strong: Lossy JPEG re-encoding at 120 DPI, 70% quality
    const res = await compressLossyRaster(arrayBuffer, 0.70, 1.25, onProgress);
    compressedBytes = res.bytes;
    pageCount = res.pageCount;
  } else if (level === 'balanced') {
    // Balanced: Attempt structural first, then check if reduction was achieved
    const res = await compressStructural(arrayBuffer, onProgress);
    compressedBytes = res.bytes;
    pageCount = res.pageCount;

    // If structural alone didn't reduce file and file is large (>1MB), test mild raster optimization
    if (compressedBytes.length >= originalBytes && originalBytes > 1024 * 1024) {
      try {
        const rasterRes = await compressLossyRaster(arrayBuffer, 0.85, 1.5, onProgress);
        if (rasterRes.bytes.length < originalBytes) {
          compressedBytes = rasterRes.bytes;
          pageCount = rasterRes.pageCount;
        }
      } catch {
        // Fallback to structural
      }
    }
  } else {
    // Lossless: Pure structural & object streams
    const res = await compressStructural(arrayBuffer, onProgress);
    compressedBytes = res.bytes;
    pageCount = res.pageCount;
  }

  // Output validation: check header and page count
  const outHeader = String.fromCharCode(...compressedBytes.slice(0, 5));
  if (!outHeader.startsWith('%PDF-')) {
    throw new Error('Compressed output validation failed: missing %PDF- header.');
  }

  // Re-verify output can be loaded
  const verifyDoc = await PDFDocument.load(compressedBytes.buffer as ArrayBuffer);
  if (verifyDoc.getPageCount() !== pageCount) {
    throw new Error(
      `Page count verification failed: original had ${pageCount} pages, output has ${verifyDoc.getPageCount()}.`
    );
  }

  const outputBytes = compressedBytes.length;
  const reductionBytes = originalBytes - outputBytes;
  const reductionPercent = Math.round((reductionBytes / originalBytes) * 100);
  const isReductionAchieved = reductionBytes > 0;

  onProgress?.(100, 'Complete!');

  const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    originalBytes,
    outputBytes,
    reductionBytes,
    reductionPercent: Math.max(0, reductionPercent),
    isReductionAchieved,
    pageCount,
    level,
    fileName: outputFileName,
  };
}
