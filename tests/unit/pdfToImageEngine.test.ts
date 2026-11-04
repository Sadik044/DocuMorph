import { describe, it, expect, vi } from 'vitest';
import { convertPdfToImages } from '../../src/services/engines/pdfToImageEngine';
import { createSyntheticPdf } from '../helpers/syntheticFiles';
import JSZip from 'jszip';

describe('pdfToImageEngine (Tool 3)', () => {
  it('rejects corrupted or non-PDF files', async () => {
    const corruptFile = new File(['corrupt data'], 'invalid.pdf', {
      type: 'application/pdf',
    });

    await expect(convertPdfToImages(corruptFile)).rejects.toThrow(
      /missing %PDF- header/i
    );
  });

  it('renders a multi-page PDF into images and packages into a ZIP archive', async () => {
    const pdfFile = await createSyntheticPdf(2, 'MultiPageDoc');

    const progressSpy = vi.fn();

    const result = await convertPdfToImages(pdfFile, {
      format: 'jpeg',
      scale: 1.0,
      createZip: true,
      onProgress: progressSpy,
    });

    expect(result.totalPages).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[0].fileName).toBe('MultiPageDoc_page_001.jpg');
    expect(result.pages[1].fileName).toBe('MultiPageDoc_page_002.jpg');

    // Verify ZIP archive was created
    expect(result.zipBlob).toBeDefined();
    expect(result.zipFileName).toBe('MultiPageDoc-images.zip');
    expect(result.zipUrl).toMatch(/^blob:/);

    // Verify ZIP content using JSZip
    const loadedZip = await JSZip.loadAsync(await result.zipBlob!.arrayBuffer());
    const fileNames = Object.keys(loadedZip.files);
    expect(fileNames).toContain('MultiPageDoc_page_001.jpg');
    expect(fileNames).toContain('MultiPageDoc_page_002.jpg');
    expect(fileNames).toHaveLength(2);

    expect(progressSpy).toHaveBeenCalledWith(100, 'Complete!');
  });

  it('supports PNG rendering format', async () => {
    const pdfFile = await createSyntheticPdf(1, 'SinglePageDoc');

    const result = await convertPdfToImages(pdfFile, {
      format: 'png',
      createZip: false,
    });

    expect(result.totalPages).toBe(1);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].fileName).toBe('SinglePageDoc_page_001.png');
    // No zip for 1 page if createZip was false or 1 page
    expect(result.zipBlob).toBeUndefined();
  });
});
