import { describe, it, expect } from 'vitest';
import {
  validateIncomingFiles,
  formatFileSize,
  getFileExtension,
} from '../../src/services/fileValidator';
import { TOOLS_CONFIG } from '../../src/config/tools';
import { FileItem } from '../../src/types/fileItem';

describe('fileValidator service', () => {
  it('formats file sizes accurately', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(25.5 * 1024 * 1024)).toBe('25.5 MB');
  });

  it('extracts lowercase file extensions with leading dot', () => {
    expect(getFileExtension('document.pdf')).toBe('.pdf');
    expect(getFileExtension('IMAGE.JPG')).toBe('.jpg');
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    expect(getFileExtension('noextension')).toBe('');
  });

  it('accepts valid PDF files for combine-pdf', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    const mockFile = new File(['%PDF-1.4 test content'], 'sample.pdf', {
      type: 'application/pdf',
    });

    const result = validateIncomingFiles([mockFile], [], config);
    expect(result.validFiles).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.validFiles[0].name).toBe('sample.pdf');
    expect(result.validFiles[0].extension).toBe('PDF');
  });

  it('rejects unsupported extensions for combine-pdf', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    const mockFile = new File(['binary content'], 'script.exe', {
      type: 'application/x-msdownload',
    });

    const result = validateIncomingFiles([mockFile], [], config);
    expect(result.validFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('INVALID_TYPE');
  });

  it('rejects files exceeding the tool max size limit', () => {
    const config = TOOLS_CONFIG['jpg-to-pdf']; // maxSizeBytes = 50MB
    const oversizedFile = new File([''], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 60 * 1024 * 1024 });

    const result = validateIncomingFiles([oversizedFile], [], config);
    expect(result.validFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('FILE_TOO_LARGE');
  });

  it('rejects empty (0 byte) files', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });

    const result = validateIncomingFiles([emptyFile], [], config);
    expect(result.validFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('EMPTY_FILE');
  });

  it('enforces maximum file queue capacity', () => {
    const config = TOOLS_CONFIG['pdf-to-jpg']; // maxFiles = 1
    const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });

    const result = validateIncomingFiles([file1, file2], [], config);
    expect(result.validFiles).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('MAX_FILES_EXCEEDED');
  });

  it('handles duplicate file names safely without overwriting', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    const existing: FileItem[] = [
      {
        id: '1',
        file: new File([''], 'doc.pdf', { type: 'application/pdf' }),
        name: 'doc.pdf',
        sizeBytes: 100,
        extension: 'PDF',
        mimeType: 'application/pdf',
        status: 'pending',
        progressPercent: 0,
        previewUrl: null,
        errorMessage: null,
      },
    ];

    const duplicateFile = new File(['new content'], 'doc.pdf', {
      type: 'application/pdf',
    });

    const result = validateIncomingFiles([duplicateFile], existing, config);
    expect(result.validFiles).toHaveLength(1);
    expect(result.validFiles[0].name).toBe('doc (1).pdf');
  });
});
