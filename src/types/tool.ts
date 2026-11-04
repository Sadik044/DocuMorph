export type ToolId = 
  | 'combine-pdf'
  | 'jpg-to-pdf'
  | 'pdf-to-jpg'
  | 'compress-pdf'
  | 'pdf-to-word'
  | 'jpg-to-text'
  | 'pdf-to-text';

export interface ToolConfig {
  id: ToolId;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  acceptedExtensions: string[];
  acceptedMimeTypes: string[];
  maxFiles: number;
  maxSizeBytes: number;
  supportsReorder: boolean;
  outputFormat: string;
  actionButtonText: string;
  engineStatus: 'ready' | 'planned';
}
