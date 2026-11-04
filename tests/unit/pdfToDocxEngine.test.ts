import { describe, it, expect, vi } from 'vitest';
import { convertPdfToDocx } from '../../src/services/engines/pdfToDocxEngine';
import { createSyntheticPdf } from '../helpers/syntheticFiles';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

describe('pdfToDocxEngine (Tool 5)', () => {
  it('converts a multi-page text PDF to a valid OpenXML DOCX file', async () => {
    const pdf = await createSyntheticPdf(2, 'InvoiceReport');
    const progressSpy = vi.fn();

    const result = await convertPdfToDocx(pdf, {
      onProgress: progressSpy,
      outputFileName: 'InvoiceReport.docx',
    });

    expect(result.fileName).toBe('InvoiceReport.docx');
    expect(result.pageCount).toBe(2);
    expect(result.byteSize).toBeGreaterThan(0);
    expect(result.url).toMatch(/^blob:/);
    expect(result.extractedCharCount).toBeGreaterThan(0);
    expect(progressSpy).toHaveBeenCalledWith(100, 'Complete!');

    // Validate DOCX package OpenXML structure
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
    const fileKeys = Object.keys(zip.files);
    expect(fileKeys).toContain('[Content_Types].xml');
    expect(fileKeys).toContain('word/document.xml');

    // Inspect document XML content
    const docXml = await zip.file('word/document.xml')?.async('text');
    expect(docXml).toBeDefined();
    expect(docXml).toContain('InvoiceReport');
  });

  it('detects probable scanned or image-only documents and sets warning', async () => {
    // Create a PDF with zero text (just blank pages)
    const doc = await PDFDocument.create();
    doc.addPage([400, 400]);
    const pdfBytes = await doc.save();
    const blankPdf = new File([pdfBytes.buffer as ArrayBuffer], 'scanned_receipt.pdf', {
      type: 'application/pdf',
    });

    const result = await convertPdfToDocx(blankPdf);

    expect(result.isProbableScanned).toBe(true);
    expect(result.extractedCharCount).toBe(0);
    expect(result.warningMessage).toMatch(/scanned image/i);
    expect(result.warningMessage).toMatch(/OCR/i);

    // Verify DOCX is still generated as a valid structure
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
    expect(Object.keys(zip.files)).toContain('word/document.xml');
  });

  it('rejects corrupted or non-PDF files missing %PDF- header', async () => {
    const invalidFile = new File(['Fake content without PDF header'], 'corrupt.pdf', {
      type: 'application/pdf',
    });

    await expect(convertPdfToDocx(invalidFile)).rejects.toThrow(/missing %PDF- header/i);
  });

  it('handles empty files gracefully with an error', async () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    await expect(convertPdfToDocx(emptyFile)).rejects.toThrow();
  });
});
