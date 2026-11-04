import React, { useRef, useState } from 'react';
import { UploadCloud, Plus } from 'lucide-react';
import { ToolConfig } from '../../types/tool';
import { formatFileSize } from '../../services/fileValidator';

interface DropZoneProps {
  config: ToolConfig;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  hasFiles?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  config,
  onFilesSelected,
  disabled = false,
  hasFiles = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleTriggerBrowse = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTriggerBrowse();
        }
      }}
      className={`relative transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        hasFiles
          ? `p-3 rounded-lg border border-dashed text-left flex items-center justify-between ${
              isDragOver
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/60 hover:border-slate-400'
            }`
          : `py-7 px-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center space-y-2.5 ${
              isDragOver
                ? 'border-brand-500 bg-brand-50/60 shadow-xs'
                : 'border-slate-300 bg-white hover:border-brand-500 hover:bg-slate-50/40'
            }`
      } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
      onClick={handleTriggerBrowse}
      role="region"
      aria-label="File Upload Dropzone"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={config.maxFiles > 1}
        accept={config.acceptedExtensions.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
        data-testid="file-input"
      />

      {hasFiles ? (
        <>
          <div className="flex items-center space-x-2 text-slate-700 text-sm">
            <UploadCloud className="w-4 h-4 text-slate-500 stroke-[2]" />
            <span className="font-medium">
              Drop more files here or <span className="text-brand-600 underline">browse</span>
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              (up to {config.maxFiles} total)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerBrowse();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Files</span>
          </button>
        </>
      ) : (
        <>
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              isDragOver ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <UploadCloud className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Drag &amp; drop files here, or{' '}
              <span className="text-brand-600 underline underline-offset-2 hover:text-brand-700">
                browse device
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supported: {config.acceptedExtensions.join(', ')} • Max {config.maxFiles} file
              {config.maxFiles > 1 ? 's' : ''} (up to {formatFileSize(config.maxSizeBytes)} each)
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerBrowse();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-1 rounded-md text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Select Files</span>
          </button>
        </>
      )}
    </div>
  );
};
