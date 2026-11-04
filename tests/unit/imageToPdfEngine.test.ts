import { describe, it, expect, vi } from 'vitest';
import { convertImagesToPdf } from '../../src/services/engines/imageToPdfEngine';
import { createSyntheticJpg, createSyntheticPng } from '../helpers/syntheticFiles';
import { PDFDocument } from 'pdf-lib';

describe('imageToPdfEngine (Tool 2)', () => {
  it('converts a single JPEG image into a 1-page PDF', async () => {
    const jpg = createSyntheticJpg('single.jpg');
    const result = await convertImagesToPdf([jpg], {
      outputFileName: 'single.pdf',
    });

    expect(result.pageCount).toBe(1);
    expect(result.byteSize).toBeGreaterThan(0);
    expect(result.fileName).toBe('single.pdf');

    const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(loaded.getPageCount()).toBe(1);
  });

  it('combines multiple images into a multi-page PDF document', async () => {
    const img1 = createSyntheticJpg('page1.jpg');
    const img2 = createSyntheticJpg('page2.jpg');
    const img3 = createSyntheticPng('page3.png');

    const progressSpy = vi.fn();

    const result = await convertImagesToPdf([img1, img2, img3], {
      pageSize: 'fit-image',
      onProgress: progressSpy,
    });

    expect(result.pageCount).toBe(3);
    expect(progressSpy).toHaveBeenCalledWith(100, 'Complete!');

    const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(loaded.getPageCount()).toBe(3);
  });

  it('supports A4 page dimensions layout', async () => {
    const img = createSyntheticJpg('photo.jpg');
    const result = await convertImagesToPdf([img], {
      pageSize: 'a4',
      margin: 20,
    });

    expect(result.pageCount).toBe(1);
    const loaded = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = loaded.getPage(0);
    expect(page.getWidth()).toBeCloseTo(595.28, 0);
    expect(page.getHeight()).toBeCloseTo(841.89, 0);
  });

  it('throws an error if empty file list is passed', async () => {
    await expect(convertImagesToPdf([])).rejects.toThrow(
      /At least one image file is required/i
    );
  });
});
