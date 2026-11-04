import { configurePdfjs } from './pdfjsSetup';
import { readFileAsArrayBuffer } from '../fileValidator';
import JSZip from 'jszip';

export interface RenderedPage {
  pageNumber: number;
  blob: Blob;
  url: string;
  fileName: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface PdfToImageOptions {
  format?: 'jpeg' | 'png';
  scale?: number; // 1.0 = ~72-96 DPI, 1.5 = ~150 DPI, 2.0 = ~300 DPI
  quality?: number; // 0.6 - 1.0 (for JPEG)
  createZip?: boolean;
  baseFileName?: string;
  onProgress?: (percent: number, message: string) => void;
}

export interface PdfToImageResult {
  pages: RenderedPage[];
  zipBlob?: Blob;
  zipUrl?: string;
  zipFileName?: string;
  totalPages: number;
}

export async function convertPdfToImages(
  file: File,
  options: PdfToImageOptions = {}
): Promise<PdfToImageResult> {
  const {
    format = 'jpeg',
    scale = 1.5,
    quality = 0.92,
    createZip = true,
    baseFileName = file.name.replace(/\.[^.]+$/, ''),
    onProgress,
  } = options;

  onProgress?.(5, 'Loading PDF.js rendering engine...');

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
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    pdfDoc = await loadingTask.promise;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
      throw new Error(
        `File "${file.name}" is password-protected and cannot be converted without unlocking.`
      );
    }
    throw new Error(`Failed to parse PDF "${file.name}": ${msg}`);
  }

  const totalPages = pdfDoc.numPages;
  if (totalPages === 0) {
    throw new Error(`Document "${file.name}" contains 0 pages.`);
  }

  const pages: RenderedPage[] = [];
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const fileExt = format === 'png' ? 'png' : 'jpg';

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d');

  if (!canvas || !ctx) {
    throw new Error('Canvas 2D rendering context is not available in the current environment.');
  }

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(
      Math.round(10 + ((pageNum - 1) / totalPages) * 75),
      `Rendering page ${pageNum} of ${totalPages}...`
    );

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // Fill white background (ensures transparent PDF vector elements render on clean white)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport,
      canvas,
    };

    await page.render(renderContext).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to encode canvas to ${mimeType} for page ${pageNum}.`));
        },
        mimeType,
        quality
      );
    });

    const pageFileName = `${baseFileName}_page_${String(pageNum).padStart(3, '0')}.${fileExt}`;
    const url = URL.createObjectURL(blob);

    pages.push({
      pageNumber: pageNum,
      blob,
      url,
      fileName: pageFileName,
      width: canvas.width,
      height: canvas.height,
      byteSize: blob.size,
    });

    // Cleanup page to prevent memory leak
    page.cleanup();
  }

  // Deallocate canvas GPU backing
  canvas.width = 0;
  canvas.height = 0;

  let zipBlob: Blob | undefined;
  let zipUrl: string | undefined;
  let zipFileName: string | undefined;

  if (createZip && totalPages > 1) {
    onProgress?.(90, 'Packaging pages into ZIP archive...');
    const zip = new JSZip();

    for (const page of pages) {
      zip.file(page.fileName, page.blob);
    }

    zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    zipFileName = `${baseFileName}-images.zip`;
    zipUrl = URL.createObjectURL(zipBlob);
  }

  onProgress?.(100, 'Complete!');

  return {
    pages,
    zipBlob,
    zipUrl,
    zipFileName,
    totalPages,
  };
}
