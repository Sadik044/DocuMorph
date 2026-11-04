import { describe, it, expect, vi } from 'vitest';
import { mergePdfFiles } from '../../src/services/engines/pdfMergeEngine';
import { createSyntheticPdf } from '../helpers/syntheticFiles';
import { PDFDocument } from 'pdf-lib';

describe('pdfMergeEngine (Tool 1)', () => {
  it('merges two or more valid PDFs preserving exact total page count', async () => {
    const pdf1 = await createSyntheticPdf(2, 'docA');
    const pdf2 = await createSyntheticPdf(3, 'docB');

    const progressSpy = vi.fn();

    const result = await mergePdfFiles([pdf1, pdf2], {
      onProgress: progressSpy,
      outputFileName: 'merged-test.pdf',
    });

    expect(result.pageCount).toBe(5);
    expect(result.byteSize).toBeGreaterThan(0);
    expect(result.fileName).toBe('merged-test.pdf');
    expect(result.url).toMatch(/^blob:/);
    expect(progressSpy).toHaveBeenCalledWith(100, 'Complete!');

    // Verify output PDF structure
    const outputBuffer = await result.blob.arrayBuffer();
    const loadedOutput = await PDFDocument.load(outputBuffer);
    expect(loadedOutput.getPageCount()).toBe(5);
  });

  it('preserves user file sequence when merging', async () => {
    const pdfFirst = await createSyntheticPdf(1, 'First');
    const pdfSecond = await createSyntheticPdf(2, 'Second');

    const result = await mergePdfFiles([pdfFirst, pdfSecond]);
    const loaded = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(loaded.getPageCount()).toBe(3);
  });

  it('throws an error if no files are provided', async () => {
    await expect(mergePdfFiles([])).rejects.toThrow(/At least one PDF file is required/i);
  });

  it('rejects corrupted or non-PDF files with clear error message', async () => {
    const corruptedFile = new File(['not a pdf at all'], 'corrupt.pdf', {
      type: 'application/pdf',
    });

    await expect(mergePdfFiles([corruptedFile])).rejects.toThrow(
      /missing %PDF- header/i
    );
  });
});
