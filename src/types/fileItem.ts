export type FileStatus = 
  | 'pending'
  | 'validating'
  | 'processing'
  | 'done'
  | 'error';

export interface FileItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  extension: string;
  mimeType: string;
  status: FileStatus;
  progressPercent: number;
  previewUrl: string | null;
  errorMessage: string | null;
  outputUrl?: string | null;
  outputSizeBytes?: number | null;
  reductionPercent?: number | null;
}

export interface ValidationError {
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'MAX_FILES_EXCEEDED' | 'DUPLICATE_NAME' | 'EMPTY_FILE';
  message: string;
  fileName?: string;
}
