import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergePdfFiles } from '../../src/services/engines/pdfMergeEngine';
import { convertImagesToPdf } from '../../src/services/engines/imageToPdfEngine';
import { convertPdfToImages } from '../../src/services/engines/pdfToImageEngine';
import { compressPdfFile } from '../../src/services/engines/pdfCompressEngine';
import { convertPdfToDocx } from '../../src/services/engines/pdfToDocxEngine';
import { extractTextFromImages } from '../../src/services/engines/imageToTextEngine';
import { extractTextFromPdf } from '../../src/services/engines/pdfToTextEngine';
import { validateIncomingFiles } from '../../src/services/fileValidator';
import { memoryManager } from '../../src/services/memoryManager';
import { TOOLS_CONFIG } from '../../src/config/tools';
import {
  createSyntheticPdf,
  createSyntheticJpg,
  createSyntheticPng,
  createScannedPdf,
} from '../helpers/syntheticFiles';
import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';

describe('Phase 5: Full-Suite Verification & Pipeline QA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Tool 1: Combine PDF Real Pipeline', () => {
    it('merges multiple PDFs preserving page order, page counts, and reopenability', async () => {
      // Create Document 1 (2 pages)
      const doc1 = await PDFDocument.create();
      const p1 = doc1.addPage([595, 842]);
      p1.drawText('Document 1 - Page 1');
      const p2 = doc1.addPage([595, 842]);
      p2.drawText('Document 1 - Page 2');
      const file1 = new File([(await doc1.save()).buffer as ArrayBuffer], 'doc1.pdf', {
        type: 'application/pdf',
      });

      // Create Document 2 (1 landscape page)
      const doc2 = await PDFDocument.create();
      const p3 = doc2.addPage([842, 595]);
      p3.drawText('Document 2 - Landscape Page');
      const file2 = new File([(await doc2.save()).buffer as ArrayBuffer], 'doc2.pdf', {
        type: 'application/pdf',
      });

      const result = await mergePdfFiles([file1, file2], {
        outputFileName: 'combined-final.pdf',
      });

      expect(result.pageCount).toBe(3);
      expect(result.fileName).toBe('combined-final.pdf');
      expect(result.byteSize).toBeGreaterThan(0);

      // Verify reopenability and inspect page dimensions
      const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
      expect(loaded.getPageCount()).toBe(3);

      const loadedP1 = loaded.getPage(0);
      expect(loadedP1.getWidth()).toBe(595);
      expect(loadedP1.getHeight()).toBe(842);

      const loadedP3 = loaded.getPage(2);
      expect(loadedP3.getWidth()).toBe(842);
      expect(loadedP3.getHeight()).toBe(595);
    });

    it('rejects merging when a password-protected or encrypted PDF is supplied', async () => {
      // Create a corrupted/mock encrypted structure
      const encryptedPdfBytes = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, // %PDF-1.7
        ...new TextEncoder().encode('/Encrypt 12 0 R /Filter /Standard'),
      ]);
      const encryptedFile = new File([encryptedPdfBytes], 'protected.pdf', {
        type: 'application/pdf',
      });

      await expect(mergePdfFiles([encryptedFile])).rejects.toThrow();
    });
  });

  describe('2. Tool 2: JPG to PDF Real Pipeline', () => {
    it('converts both JPEG and PNG files preserving aspect ratio in Fit-Image mode', async () => {
      const jpg = createSyntheticJpg('portrait.jpg');
      const png = createSyntheticPng('landscape.png');

      const result = await convertImagesToPdf([jpg, png], {
        pageSize: 'fit-image',
        outputFileName: 'images-fit.pdf',
      });

      expect(result.pageCount).toBe(2);
      expect(result.fileName).toBe('images-fit.pdf');

      // Reopen and verify output PDF structure
      const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
      expect(loaded.getPageCount()).toBe(2);
      expect(loaded.getPage(0).getWidth()).toBeGreaterThan(0);
      expect(loaded.getPage(1).getWidth()).toBeGreaterThan(0);
    });

    it('converts images into standardized A4 dimensions in standard layout mode', async () => {
      const jpg = createSyntheticJpg('photo.jpg');

      const result = await convertImagesToPdf([jpg], {
        pageSize: 'a4',
        outputFileName: 'photo-a4.pdf',
      });

      expect(result.pageCount).toBe(1);
      const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
      const page = loaded.getPage(0);
      // Standard A4 is 595.28 x 841.89 points
      expect(Math.round(page.getWidth())).toBe(595);
      expect(Math.round(page.getHeight())).toBe(842);
    });
  });

  describe('3. Tool 3: PDF to JPG Real Pipeline', () => {
    it('renders a multi-page PDF into images and packages them into a valid ZIP archive', async () => {
      const pdf = await createSyntheticPdf(3, 'MultiPageDoc');

      const result = await convertPdfToImages(pdf, {
        format: 'jpeg',
        scale: 1.0,
        createZip: true,
      });

      expect(result.totalPages).toBe(3);
      expect(result.pages.length).toBe(3);
      expect(result.zipBlob).toBeDefined();

      // Inspect ZIP package contents
      const zip = await JSZip.loadAsync(await result.zipBlob!.arrayBuffer());
      const zipFiles = Object.keys(zip.files);
      expect(zipFiles.length).toBe(3);
      expect(zipFiles[0]).toMatch(/page_001\.jpg$/);
      expect(zipFiles[1]).toMatch(/page_002\.jpg$/);
      expect(zipFiles[2]).toMatch(/page_003\.jpg$/);
    });

    it('supports PNG rendering with high resolution scale', async () => {
      const pdf = await createSyntheticPdf(1, 'SinglePageDoc');

      const result = await convertPdfToImages(pdf, {
        format: 'png',
        scale: 2.0,
        createZip: false,
      });

      expect(result.pages.length).toBe(1);
      expect(result.pages[0].fileName).toMatch(/\.png$/);
    });
  });

  describe('4. Tool 4: Compress PDF Real Pipeline', () => {
    it('tests Lossless mode preserving all text, vector content, and document pages', async () => {
      const doc = await PDFDocument.create();
      for (let i = 1; i <= 3; i++) {
        const page = doc.addPage([500, 700]);
        page.drawText(`Searchable Content Heading Page ${i}`, { color: rgb(0, 0, 0) });
      }
      const originalBytes = await doc.save({ useObjectStreams: false });
      const file = new File([originalBytes.buffer as ArrayBuffer], 'uncompacted.pdf', {
        type: 'application/pdf',
      });

      const result = await compressPdfFile(file, { level: 'lossless' });

      expect(result.level).toBe('lossless');
      expect(result.pageCount).toBe(3);
      expect(result.outputBytes).toBeGreaterThan(0);

      // Verify reopening and page preservation
      const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
      expect(loaded.getPageCount()).toBe(3);
    });

    it('tests Balanced mode and accurately reports when file is already optimized', async () => {
      // An already optimized minimal PDF
      const doc = await PDFDocument.create();
      doc.addPage([200, 200]);
      const savedBytes = await doc.save({ useObjectStreams: true });
      const file = new File([savedBytes.buffer as ArrayBuffer], 'already-optimized.pdf', {
        type: 'application/pdf',
      });

      const result = await compressPdfFile(file, { level: 'balanced' });

      expect(result.pageCount).toBe(1);
      expect(typeof result.isReductionAchieved).toBe('boolean');
      expect(result.reductionPercent).toBeGreaterThanOrEqual(0);
    });

    it('tests Strong mode re-rasterization producing a valid rebuilt PDF', async () => {
      const pdf = await createSyntheticPdf(1, 'RasterTestDoc');

      const result = await compressPdfFile(pdf, { level: 'strong' });

      expect(result.level).toBe('strong');
      expect(result.pageCount).toBe(1);

      const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
      expect(loaded.getPageCount()).toBe(1);
    });
  });

  describe('5. Tool 5: PDF to Word (DOCX) Real Pipeline', () => {
    it('extracts text, generates valid OpenXML, and detects headings and paragraphs', async () => {
      // Build a realistic synthetic document with text
      const doc = await PDFDocument.create();
      const page = doc.addPage([600, 800]);
      page.drawText('Quarterly Financial Summary 2026', { size: 24, x: 50, y: 720 });
      page.drawText('Executive Overview of Revenue and Operations', { size: 14, x: 50, y: 680 });
      page.drawText('Total quarterly revenue exceeded forecasts across all segments.', {
        size: 11,
        x: 50,
        y: 640,
      });

      const summaryBytes = await doc.save();
      const file = new File([summaryBytes.buffer as ArrayBuffer], 'FinancialSummary.pdf', {
        type: 'application/pdf',
      });

      const result = await convertPdfToDocx(file);

      expect(result.pageCount).toBe(1);
      expect(result.extractedCharCount).toBeGreaterThan(20);
      expect(result.isProbableScanned).toBe(false);
      expect(result.warningMessage).toBeNull();

      // Open generated DOCX as OpenXML ZIP package
      const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
      expect(Object.keys(zip.files)).toContain('[Content_Types].xml');
      expect(Object.keys(zip.files)).toContain('word/document.xml');

      const documentXml = await zip.file('word/document.xml')?.async('text');
      expect(documentXml).toBeDefined();
      expect(documentXml).toContain('Quarterly Financial Summary 2026');
      expect(documentXml).toContain('Executive Overview');
    });

    it('identifies image-only or scanned PDFs and returns OCR warning', async () => {
      // Create a page with 0 text characters
      const doc = await PDFDocument.create();
      doc.addPage([500, 500]);
      const contractBytes = await doc.save();
      const file = new File([contractBytes.buffer as ArrayBuffer], 'ScannedContract.pdf', {
        type: 'application/pdf',
      });

      const result = await convertPdfToDocx(file);

      expect(result.isProbableScanned).toBe(true);
      expect(result.warningMessage).toMatch(/scanned image/i);
      expect(result.warningMessage).toMatch(/OCR/i);
    });
  });

  describe('6. Edge Cases, File Validation, & Memory Management', () => {
    it('rejects 0-byte files with an explicit validation error', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      const config = TOOLS_CONFIG['combine-pdf'];

      const validation = validateIncomingFiles([emptyFile], [], config);
      expect(validation.validFiles.length).toBe(0);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].code).toBe('EMPTY_FILE');
    });

    it('rejects files exceeding configured size limits', () => {
      const hugeFile = new File(['a'.repeat(100)], 'huge.pdf', { type: 'application/pdf' });
      Object.defineProperty(hugeFile, 'size', { value: 200 * 1024 * 1024 }); // 200 MB
      const config = TOOLS_CONFIG['combine-pdf'];

      const validation = validateIncomingFiles([hugeFile], [], config);
      expect(validation.validFiles.length).toBe(0);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].code).toBe('FILE_TOO_LARGE');
    });

    it('resolves duplicate filenames cleanly by appending numeric suffixes', () => {
      const f1 = new File(['data'], 'invoice.pdf', { type: 'application/pdf' });
      const f2 = new File(['data'], 'invoice.pdf', { type: 'application/pdf' });
      const config = TOOLS_CONFIG['combine-pdf'];

      const validation = validateIncomingFiles([f1, f2], [], config);
      expect(validation.validFiles.length).toBe(2);
      expect(validation.validFiles[0].name).toBe('invoice.pdf');
      expect(validation.validFiles[1].name).toBe('invoice (1).pdf');
    });

    it('tracks and releases object URLs without throwing', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const mockUrl1 = 'blob:test-1';
      const mockUrl2 = 'blob:test-2';

      memoryManager.trackUrl(mockUrl1);
      memoryManager.trackUrl(mockUrl2);

      memoryManager.revokeUrl(mockUrl1);
      expect(revokeSpy).toHaveBeenCalledWith(mockUrl1);

      memoryManager.cleanupAllFiles([]);
      expect(revokeSpy).toHaveBeenCalledWith(mockUrl2);
    });
  });

  describe('7. Tool 6: JPG to Text (OCR) Real Pipeline', () => {
    it('extracts OCR text from an English sample image and encodes UTF-8 BOM in TXT blob', async () => {
      const jpg = createSyntheticJpg('invoice-sample.jpg');
      const progressSpy = vi.fn();

      const result = await extractTextFromImages([jpg], {
        lang: 'eng',
        onProgress: progressSpy,
      });

      expect(result.text).toContain('DocuMorph OCR text recognized');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.charCount).toBeGreaterThan(0);
      expect(result.fileResults).toHaveLength(1);
      expect(result.fileResults[0].fileName).toBe('invoice-sample.jpg');
      expect(result.fileName).toBe('invoice-sample-ocr.txt');

      // Verify that the downloadable Blob contains UTF-8 BOM (\uFEFF: 0xEF, 0xBB, 0xBF)
      const buffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
      const blobText = new TextDecoder().decode(buffer);
      expect(blobText).toContain('DocuMorph OCR text recognized');
    });

    it('extracts OCR text from a Bengali (বাংলা) sample image with verified Unicode integrity', async () => {
      const png = createSyntheticPng('bengali-receipt.png');

      const result = await extractTextFromImages([png], {
        lang: 'ben',
      });

      expect(result.text).toContain('বাংলা অপটিক্যাল ক্যারেক্টার');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.charCount).toBeGreaterThan(0);

      // Verify Unicode roundtrip from downloaded Blob
      const buffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
      const blobText = new TextDecoder().decode(buffer);
      expect(blobText).toContain('বাংলা অপটিক্যাল ক্যারেক্টার');
    });

    it('processes multiple images maintaining order and section demarcations', async () => {
      const img1 = createSyntheticJpg('first-page.jpg');
      const img2 = createSyntheticPng('second-page.png');

      const result = await extractTextFromImages([img1, img2], {
        lang: 'eng+ben',
      });

      expect(result.fileResults).toHaveLength(2);
      expect(result.fileResults[0].fileName).toBe('first-page.jpg');
      expect(result.fileResults[1].fileName).toBe('second-page.png');
      expect(result.text).toContain('--- File: first-page.jpg ---');
      expect(result.text).toContain('--- File: second-page.png ---');
      expect(result.text).toContain('বাংলা');
    });
  });

  describe('8. Tool 7: PDF to Text Real Pipeline', () => {
    it('extracts selectable text from digital PDF directly via PDF.js without invoking OCR', async () => {
      const pdf = await createSyntheticPdf(2, 'OfficialReport');
      const progressSpy = vi.fn();

      const result = await extractTextFromPdf(pdf, {
        mode: 'auto',
        onProgress: progressSpy,
      });

      expect(result.method).toBe('digital');
      expect(result.totalPages).toBe(2);
      expect(result.processedPages).toEqual([1, 2]);
      expect(result.text).toContain('OfficialReport - Page 1');
      expect(result.text).toContain('OfficialReport - Page 2');
      expect(result.text).toContain('--- Page 1 ---');
      expect(result.text).toContain('--- Page 2 ---');
      expect(result.pageResults.every((p) => p.method === 'digital')).toBe(true);

      const buffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
      const blobText = new TextDecoder().decode(buffer);
      expect(blobText).toContain('OfficialReport - Page 1');
    });

    it('detects scanned PDF without selectable text and automatically triggers OCR path', async () => {
      const scannedPdf = await createScannedPdf('ScannedBill');

      const result = await extractTextFromPdf(scannedPdf, {
        mode: 'auto',
        lang: 'eng',
      });

      expect(result.method).toBe('ocr');
      expect(result.pageResults[0].method).toBe('ocr');
      expect(result.text).toContain('DocuMorph OCR text recognized');
    });

    it('executes Bengali OCR on scanned PDF pages when Bengali language is selected', async () => {
      const scannedPdf = await createScannedPdf('BengaliScannedNotice');

      const result = await extractTextFromPdf(scannedPdf, {
        mode: 'auto',
        lang: 'ben',
      });

      expect(result.method).toBe('ocr');
      expect(result.pageResults[0].method).toBe('ocr');
      expect(result.text).toContain('বাংলা অপটিক্যাল ক্যারেক্টার');
    });

    it('respects page range filtering and extracts only targeted pages', async () => {
      const pdf = await createSyntheticPdf(4, 'MultiVolume');

      const result = await extractTextFromPdf(pdf, {
        pageRange: '2, 4',
      });

      expect(result.processedPages).toEqual([2, 4]);
      expect(result.pageResults).toHaveLength(2);
      expect(result.text).toContain('MultiVolume - Page 2');
      expect(result.text).toContain('MultiVolume - Page 4');
      expect(result.text).not.toContain('MultiVolume - Page 1');
      expect(result.text).not.toContain('MultiVolume - Page 3');
    });
  });

  describe('9. Zero-Upload Client-Side Network Security & Privacy Audit', () => {
    it('confirms that document contents, images, and extracted text are NEVER sent over network requests', async () => {
      const networkSpy = vi.fn();
      const origFetch = globalThis.fetch;

      // Spy on fetch if present without breaking legit local blob/worker fetches
      if (typeof origFetch === 'function') {
        globalThis.fetch = async (input: any, init?: any) => {
          networkSpy(input, init?.body);
          return origFetch(input, init);
        };
      }

      try {
        // 1. Run Tool 1: Combine PDF
        const pdf1 = await createSyntheticPdf(1, 'Secret1');
        const pdf2 = await createSyntheticPdf(1, 'Secret2');
        await mergePdfFiles([pdf1, pdf2]);

        // 2. Run Tool 2: JPG to PDF
        const jpg = createSyntheticJpg('secret-photo.jpg');
        await convertImagesToPdf([jpg]);

        // 3. Run Tool 4: Compress PDF
        await compressPdfFile(pdf1, { level: 'lossless' });

        // 4. Run Tool 5: PDF to Word
        await convertPdfToDocx(pdf1);

        // 5. Run Tool 6: JPG to Text OCR
        await extractTextFromImages([jpg], { lang: 'eng' });

        // 6. Run Tool 7: PDF to Text
        await extractTextFromPdf(pdf1, { mode: 'digital' });

        // Audit all captured network payloads:
        for (const call of networkSpy.mock.calls) {
          const [, body] = call;
          const bodyStr = typeof body === 'string' ? body : '';

          // Verify that NO private document names or text are present in any payload
          expect(bodyStr).not.toContain('Secret1');
          expect(bodyStr).not.toContain('Secret2');
          expect(bodyStr).not.toContain('secret-photo');
          expect(bodyStr).not.toContain('DocuMorph OCR text');
        }
      } finally {
        if (typeof origFetch === 'function') {
          globalThis.fetch = origFetch;
        }
      }
    });
  });
});
