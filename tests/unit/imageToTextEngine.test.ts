import { describe, it, expect, vi } from 'vitest';
import {
  extractTextFromImages,
  calculateWordCount,
} from '../../src/services/engines/imageToTextEngine';
import { createSyntheticJpg, createSyntheticPng } from '../helpers/syntheticFiles';

describe('imageToTextEngine (Tool 6: JPG to Text OCR)', () => {
  it('correctly calculates word counts for single words, sentences, and empty strings', () => {
    expect(calculateWordCount('')).toBe(0);
    expect(calculateWordCount('   ')).toBe(0);
    expect(calculateWordCount('Hello')).toBe(1);
    expect(calculateWordCount('Hello DocuMorph World')).toBe(3);
    expect(calculateWordCount('বাংলা ওসিআর টেস্ট')).toBe(3);
  });

  it('extracts OCR text from a single JPEG image in English', async () => {
    const jpg = createSyntheticJpg('invoice.jpg');
    const progressSpy = vi.fn();

    const result = await extractTextFromImages([jpg], {
      lang: 'eng',
      onProgress: progressSpy,
    });

    expect(result.text).toContain('DocuMorph OCR text recognized');
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.charCount).toBeGreaterThan(0);
    expect(result.fileResults).toHaveLength(1);
    expect(result.fileResults[0].fileName).toBe('invoice.jpg');
    expect(result.fileName).toBe('invoice-ocr.txt');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.url).toBeTruthy();
    expect(progressSpy).toHaveBeenCalledWith(100, expect.any(String));
  });

  it('supports Bengali (বাংলা) OCR language extraction', async () => {
    const png = createSyntheticPng('bengali-receipt.png');

    const result = await extractTextFromImages([png], {
      lang: 'ben',
    });

    expect(result.text).toContain('বাংলা অপটিক্যাল ক্যারেক্টার');
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.charCount).toBeGreaterThan(0);
    expect(result.fileResults[0].text).toContain('বাংলা');
  });

  it('supports mixed English + Bengali (eng+ben) recognition', async () => {
    const img = createSyntheticJpg('multilingual.jpg');

    const result = await extractTextFromImages([img], {
      lang: 'eng+ben',
    });

    expect(result.text).toContain('Document text in English and বাংলা');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('aggregates multiple images with formatted file boundary headers', async () => {
    const img1 = createSyntheticJpg('page1.jpg');
    const img2 = createSyntheticPng('page2.png');

    const result = await extractTextFromImages([img1, img2], {
      lang: 'eng',
    });

    expect(result.fileResults).toHaveLength(2);
    expect(result.text).toContain('--- File: page1.jpg ---');
    expect(result.text).toContain('--- File: page2.png ---');
    expect(result.fileName).toBe('documorph-extracted-text.txt');
    expect(result.wordCount).toBeGreaterThan(result.fileResults[0].wordCount);
  });

  it('throws a meaningful error when passed an empty files array', async () => {
    await expect(extractTextFromImages([])).rejects.toThrow(
      'No image files provided for OCR extraction.'
    );
  });
});
