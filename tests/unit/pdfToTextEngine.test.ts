import { describe, it, expect, vi } from 'vitest';
import {
  extractTextFromPdf,
  parsePageRange,
} from '../../src/services/engines/pdfToTextEngine';
import { createSyntheticPdf } from '../helpers/syntheticFiles';

describe('pdfToTextEngine (Tool 7: PDF to Text)', () => {
  describe('parsePageRange', () => {
    it('returns all page numbers when given "all", empty string, or whitespace', () => {
      expect(parsePageRange('all', 5)).toEqual([1, 2, 3, 4, 5]);
      expect(parsePageRange('', 3)).toEqual([1, 2, 3]);
      expect(parsePageRange('   ', 4)).toEqual([1, 2, 3, 4]);
    });

    it('parses hyphenated ranges like "1-3" within document bounds', () => {
      expect(parsePageRange('1-3', 10)).toEqual([1, 2, 3]);
      expect(parsePageRange('2-4', 5)).toEqual([2, 3, 4]);
      expect(parsePageRange('4-10', 5)).toEqual([4, 5]); // capped at totalPages
    });

    it('parses comma-separated pages and mixed lists like "1, 3, 5-6"', () => {
      expect(parsePageRange('1, 3', 5)).toEqual([1, 3]);
      expect(parsePageRange('1, 3, 5-6', 6)).toEqual([1, 3, 5, 6]);
    });

    it('handles out-of-order or duplicate inputs gracefully', () => {
      expect(parsePageRange('3, 1, 2, 3', 5)).toEqual([1, 2, 3]);
    });
  });

  describe('extractTextFromPdf Engine', () => {
    it('extracts direct digital selectable text from a multi-page PDF', async () => {
      const pdf = await createSyntheticPdf(2, 'ContractDoc');
      const progressSpy = vi.fn();

      const result = await extractTextFromPdf(pdf, {
        mode: 'digital',
        onProgress: progressSpy,
      });

      expect(result.totalPages).toBe(2);
      expect(result.processedPages).toEqual([1, 2]);
      expect(result.method).toBe('digital');
      expect(result.text).toContain('ContractDoc - Page 1');
      expect(result.text).toContain('ContractDoc - Page 2');
      expect(result.text).toContain('--- Page 1 ---');
      expect(result.text).toContain('--- Page 2 ---');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.charCount).toBeGreaterThan(0);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.url).toBeTruthy();
      expect(progressSpy).toHaveBeenCalledWith(100, expect.any(String));
    });

    it('respects pageRange option and only extracts selected pages', async () => {
      const pdf = await createSyntheticPdf(3, 'MultiReport');

      const result = await extractTextFromPdf(pdf, {
        mode: 'digital',
        pageRange: '2-3',
      });

      expect(result.totalPages).toBe(3);
      expect(result.processedPages).toEqual([2, 3]);
      expect(result.pageResults).toHaveLength(2);
      expect(result.text).toContain('MultiReport - Page 2');
      expect(result.text).toContain('MultiReport - Page 3');
      expect(result.text).not.toContain('MultiReport - Page 1');
    });

    it('executes OCR path when forced mode is "ocr"', async () => {
      const pdf = await createSyntheticPdf(1, 'ScannedInvoice');

      const result = await extractTextFromPdf(pdf, {
        mode: 'ocr',
        lang: 'eng',
      });

      expect(result.method).toBe('ocr');
      expect(result.text).toContain('DocuMorph OCR text recognized');
      expect(result.pageResults[0].method).toBe('ocr');
    });

    it('supports Bengali OCR on PDF pages', async () => {
      const pdf = await createSyntheticPdf(1, 'BengaliNotice');

      const result = await extractTextFromPdf(pdf, {
        mode: 'ocr',
        lang: 'ben',
      });

      expect(result.method).toBe('ocr');
      expect(result.text).toContain('বাংলা অপটিক্যাল ক্যারেক্টার');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('throws error for non-PDF files missing %PDF- header', async () => {
      const fakeFile = new File(['This is plain text and not PDF'], 'bad.pdf', {
        type: 'application/pdf',
      });

      await expect(extractTextFromPdf(fakeFile)).rejects.toThrow(
        'missing %PDF- header'
      );
    });
  });
});
