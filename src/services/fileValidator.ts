import { ToolConfig } from '../types/tool';
import { FileItem, ValidationError } from '../types/fileItem';

export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return `.${parts.pop()!.toLowerCase()}`;
}

export function generateFileId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      return await file.arrayBuffer();
    } catch {
      // Fallback to FileReader
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error(`Failed to read file ${file.name} as ArrayBuffer.`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read bytes from file "${file.name}".`));
    reader.readAsArrayBuffer(file);
  });
}

export interface ValidationResult {
  validFiles: FileItem[];
  errors: ValidationError[];
}

export function validateIncomingFiles(
  incomingFiles: File[],
  existingFiles: FileItem[],
  config: ToolConfig
): ValidationResult {
  const validFiles: FileItem[] = [];
  const errors: ValidationError[] = [];

  const remainingSlotCount = config.maxFiles - existingFiles.length;

  if (remainingSlotCount <= 0) {
    errors.push({
      code: 'MAX_FILES_EXCEEDED',
      message: `Maximum of ${config.maxFiles} file${config.maxFiles > 1 ? 's' : ''} allowed for ${config.title}. Remove files to add new ones.`,
    });
    return { validFiles, errors };
  }

  // Create a set of existing file names for quick collision checks
  const existingNames = new Set(existingFiles.map((f) => f.name.toLowerCase()));

  for (let i = 0; i < incomingFiles.length; i++) {
    const file = incomingFiles[i];

    // Check slot limit
    if (validFiles.length >= remainingSlotCount) {
      errors.push({
        code: 'MAX_FILES_EXCEEDED',
        message: `Only ${remainingSlotCount} additional file${remainingSlotCount > 1 ? 's' : ''} could be added (limit: ${config.maxFiles}).`,
      });
      break;
    }

    // Check for empty files
    if (file.size === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        fileName: file.name,
        message: `"${file.name}" is empty (0 bytes) and cannot be processed.`,
      });
      continue;
    }

    // Check file size
    if (file.size > config.maxSizeBytes) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        fileName: file.name,
        message: `"${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed limit of ${formatFileSize(config.maxSizeBytes)}.`,
      });
      continue;
    }

    // Check extension
    const ext = getFileExtension(file.name);
    const hasValidExt = config.acceptedExtensions.some(
      (validExt) => validExt.toLowerCase() === ext
    );

    // Check MIME type if present
    const hasValidMime = file.type
      ? config.acceptedMimeTypes.includes(file.type.toLowerCase())
      : true; // Some platforms leave MIME type empty; extension check is primary fallback

    if (!hasValidExt && !hasValidMime) {
      errors.push({
        code: 'INVALID_TYPE',
        fileName: file.name,
        message: `"${file.name}" has an unsupported format. Supported extensions: ${config.acceptedExtensions.join(', ')}.`,
      });
      continue;
    }

    // Handle duplicates safely by appending suffix if already in queue
    let finalName = file.name;
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    let duplicateIndex = 1;
    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${baseName} (${duplicateIndex})${ext}`;
      duplicateIndex++;
    }
    existingNames.add(finalName.toLowerCase());

    const item: FileItem = {
      id: generateFileId(),
      file,
      name: finalName,
      sizeBytes: file.size,
      extension: ext.replace('.', '').toUpperCase(),
      mimeType: file.type,
      status: 'pending',
      progressPercent: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      errorMessage: null,
    };

    validFiles.push(item);
  }

  return { validFiles, errors };
}
