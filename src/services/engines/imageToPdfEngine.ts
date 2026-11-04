import { PDFDocument, PageSizes } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../fileValidator';

export interface ImageToPdfOptions {
  pageSize?: 'fit-image' | 'a4';
  margin?: number;
  onProgress?: (percent: number, currentFileName: string) => void;
  outputFileName?: string;
}

export interface ImageToPdfResult {
  blob: Blob;
  url: string;
  pageCount: number;
  byteSize: number;
  fileName: string;
}

/**
 * Normalizes an image file to bytes and determines if it can be directly embedded in pdf-lib.
 * For transparent PNGs or unsupported formats (webp, bmp), composites on white canvas.
 */
async function processImageForPdf(
  file: File,
  pdfDoc: PDFDocument
): Promise<{ image: ReturnType<typeof pdfDoc.embedJpg> extends Promise<infer T> ? T : never; width: number; height: number }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Direct JPEG Embedding (Lossless byte stream passthrough)
  if (extension === 'jpg' || extension === 'jpeg' || file.type === 'image/jpeg') {
    try {
      const jpgImage = await pdfDoc.embedJpg(bytes);
      return {
        image: jpgImage,
        width: jpgImage.width,
        height: jpgImage.height,
      };
    } catch {
      // Fallback to canvas if JPEG has unusual color space (e.g. CMYK)
    }
  }

  // 2. Direct PNG Embedding if supported
  if (extension === 'png' || file.type === 'image/png') {
    try {
      const pngImage = await pdfDoc.embedPng(bytes);
      return {
        image: pngImage,
        width: pngImage.width,
        height: pngImage.height,
      };
    } catch {
      // Fallback to canvas
    }
  }

  // 3. Canvas normalization (for WebP, BMP, or transparent PNGs)
  if (typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
          }

          // Fill white background for transparent images
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                reject(new Error(`Failed to convert image ${file.name} to JPEG buffer.`));
                return;
              }
              const blobBytes = new Uint8Array(await blob.arrayBuffer());
              const embeddedJpg = await pdfDoc.embedJpg(blobBytes);
              resolve({
                image: embeddedJpg,
                width: canvas.width,
                height: canvas.height,
              });
            },
            'image/jpeg',
            0.95
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load image "${file.name}". File may be corrupted.`));
      };

      img.src = objectUrl;
    });
  }

  // Node/test environment fallback
  throw new Error(`Unsupported image format or missing DOM environment for "${file.name}".`);
}

/**
 * Converts one or multiple images into a combined multi-page PDF document.
 */
export async function convertImagesToPdf(
  files: File[],
  options: ImageToPdfOptions = {}
): Promise<ImageToPdfResult> {
  if (!files || files.length === 0) {
    throw new Error('At least one image file is required to create a PDF.');
  }

  const {
    pageSize = 'fit-image',
    margin = 0,
    onProgress,
    outputFileName = 'images-converted.pdf',
  } = options;

  onProgress?.(5, 'Initializing PDF Document...');

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(
      Math.round(10 + (i / files.length) * 80),
      `Processing image ${i + 1} of ${files.length}: ${file.name}...`
    );

    const { image, width: imgWidth, height: imgHeight } = await processImageForPdf(file, pdfDoc);

    if (pageSize === 'a4') {
      // Determine if image is portrait or landscape
      const isLandscape = imgWidth > imgHeight;
      const baseA4 = isLandscape ? [PageSizes.A4[1], PageSizes.A4[0]] : PageSizes.A4;
      const page = pdfDoc.addPage([baseA4[0], baseA4[1]]);

      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      // Fit proportionally
      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      // Exact image dimensions (fit-image)
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    }
  }

  onProgress?.(92, 'Finalizing PDF output...');

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  // Output validation
  if (pdfBytes.length === 0) {
    throw new Error('Generated PDF byte stream is empty.');
  }

  const outHeader = String.fromCharCode(...pdfBytes.slice(0, 5));
  if (!outHeader.startsWith('%PDF-')) {
    throw new Error('Validation failed: output does not begin with valid PDF signature.');
  }

  if (pdfDoc.getPageCount() !== files.length) {
    throw new Error(
      `Page count mismatch: expected ${files.length} pages, got ${pdfDoc.getPageCount()}.`
    );
  }

  onProgress?.(100, 'Complete!');

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    pageCount: pdfDoc.getPageCount(),
    byteSize: pdfBytes.length,
    fileName: outputFileName.endsWith('.pdf') ? outputFileName : `${outputFileName}.pdf`,
  };
}
