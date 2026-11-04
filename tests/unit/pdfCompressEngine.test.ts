import { describe, it, expect, vi } from 'vitest';
import { compressPdfFile } from '../../src/services/engines/pdfCompressEngine';
import { createSyntheticPdf } from '../helpers/syntheticFiles';
import { PDFDocument } from 'pdf-lib';

describe('pdfCompressEngine (Tool 4)', () => {
  it('compresses a synthetic PDF using lossless structural mode', async () => {
    const pdf = await createSyntheticPdf(3, 'LosslessReport');
    const progressSpy = vi.fn();

    const result = await compressPdfFile(pdf, {
      level: 'lossless',
      onProgress: progressSpy,
      outputFileName: 'custom-compressed.pdf',
    });

    expect(result.fileName).toBe('custom-compressed.pdf');
    expect(result.level).toBe('lossless');
    expect(result.pageCount).toBe(3);
    expect(result.originalBytes).toBeGreaterThan(0);
    expect(result.outputBytes).toBeGreaterThan(0);
    expect(typeof result.isReductionAchieved).toBe('boolean');
    expect(result.url).toMatch(/^blob:/);
    expect(progressSpy).toHaveBeenCalledWith(100, 'Complete!');

    // Verify output PDF validity and page preservation
    const outputBuffer = await result.blob.arrayBuffer();
    const verifiedDoc = await PDFDocument.load(outputBuffer);
    expect(verifiedDoc.getPageCount()).toBe(3);
  });

  it('runs balanced mode successfully preserving document structure', async () => {
    const pdf = await createSyntheticPdf(2, 'BalancedDocument');

    const result = await compressPdfFile(pdf, {
      level: 'balanced',
    });

    expect(result.level).toBe('balanced');
    expect(result.pageCount).toBe(2);
    expect(result.outputBytes).toBeGreaterThan(0);
    expect(result.reductionPercent).toBeGreaterThanOrEqual(0);

    const verifiedDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(verifiedDoc.getPageCount()).toBe(2);
  });

  it('runs strong lossy mode re-encoding pages', async () => {
    const pdf = await createSyntheticPdf(1, 'StrongDocument');
    const progressSpy = vi.fn();

    const result = await compressPdfFile(pdf, {
      level: 'strong',
      onProgress: progressSpy,
    });

    expect(result.level).toBe('strong');
    expect(result.pageCount).toBe(1);
    expect(result.blob.size).toBeGreaterThan(0);
    expect(progressSpy).toHaveBeenCalledWith(100, 'Complete!');

    const verifiedDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(verifiedDoc.getPageCount()).toBe(1);
  });

  it('correctly calculates reduction metrics when bytes change', async () => {
    // Generate an uncompacted PDF
    const doc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      const p = doc.addPage([600, 800]);
      p.drawText(`Page content line ${i} with extra padding metadata string value here.`);
    }
    // Save without object streams first to leave overhead
    const uncompressedBytes = await doc.save({ useObjectStreams: false });
    const uncompressedFile = new File([uncompressedBytes.buffer as ArrayBuffer], 'large.pdf', {
      type: 'application/pdf',
    });

    const result = await compressPdfFile(uncompressedFile, { level: 'lossless' });

    expect(result.originalBytes).toBe(uncompressedFile.size);
    expect(result.outputBytes).toBe(result.blob.size);
    expect(result.reductionBytes).toBe(result.originalBytes - result.outputBytes);
    expect(result.reductionPercent).toBe(
      Math.max(0, Math.round((result.reductionBytes / result.originalBytes) * 100))
    );
  });

  it('handles already-optimized PDFs honestly without fabricating reduction', async () => {
    // Generate an already stream-compressed PDF
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const bytes = await doc.save({ useObjectStreams: true });
    const compactFile = new File([bytes.buffer as ArrayBuffer], 'compact.pdf', {
      type: 'application/pdf',
    });

    const result = await compressPdfFile(compactFile, { level: 'lossless' });
    // If output is not smaller, isReductionAchieved must be false
    if (result.outputBytes >= result.originalBytes) {
      expect(result.isReductionAchieved).toBe(false);
      expect(result.reductionPercent).toBe(0);
    }
  });

  it('rejects empty (0-byte) files with a clear error', async () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    await expect(compressPdfFile(emptyFile)).rejects.toThrow(/empty \(0 bytes\)/i);
  });

  it('rejects invalid or non-PDF files missing %PDF- header', async () => {
    const invalidFile = new File(['This is plain text and not a PDF'], 'invalid.pdf', {
      type: 'application/pdf',
    });
    await expect(compressPdfFile(invalidFile)).rejects.toThrow(/missing %PDF- header/i);
  });
});
