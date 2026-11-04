import React from 'react';
import { ToolConfig } from '../../types/tool';
import { FileItem } from '../../types/fileItem';
import { Trash2, ArrowRight, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { formatFileSize } from '../../services/fileValidator';

export interface DownloadResultData {
  url: string;
  fileName: string;
  byteSize: number;
  pageCount?: number;
  label?: string;
}

interface ActionControlsProps {
  config: ToolConfig;
  files: FileItem[];
  isProcessing: boolean;
  downloadResult?: DownloadResultData | null;
  onClearAll: () => void;
  onProcessRequested: () => void;
  onDownloadRequested?: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  config,
  files,
  isProcessing,
  downloadResult,
  onClearAll,
  onProcessRequested,
  onDownloadRequested,
}) => {
  const hasFiles = files.length > 0;
  const hasErrors = files.some((f) => f.status === 'error');
  const allReady = hasFiles && !hasErrors && !isProcessing;

  const handleDownload = () => {
    if (onDownloadRequested) {
      onDownloadRequested();
      return;
    }
    if (downloadResult) {
      const a = document.createElement('a');
      a.href = downloadResult.url;
      a.download = downloadResult.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
      {/* Left: Clear button & file count summary */}
      <div className="flex items-center space-x-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasFiles || isProcessing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
            hasFiles && !isProcessing
              ? 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:text-rose-600 active:bg-slate-100 shadow-2xs'
              : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
          }`}
          data-testid="clear-all-btn"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        {hasFiles && (
          <span className="text-xs text-slate-500 font-medium">
            {files.length} / {config.maxFiles} file{files.length > 1 ? 's' : ''} queued
          </span>
        )}
      </div>

      {/* Right: Error hint, Download Button or Primary Action Button */}
      <div className="flex flex-wrap items-center space-x-2.5 w-full sm:w-auto justify-end">
        {hasErrors && !isProcessing && (
          <div className="flex items-center text-xs text-rose-600 font-medium bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>Remove files with errors</span>
          </div>
        )}

        {downloadResult && !isProcessing ? (
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer"
            data-testid="download-result-btn"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>{downloadResult.label || `DOWNLOAD ${config.outputFormat}`}</span>
            <span className="text-xs font-mono font-normal opacity-90 ml-1">
              ({formatFileSize(downloadResult.byteSize)})
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onProcessRequested}
            disabled={!allReady}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all shadow-xs ${
              allReady
                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-[0.99]'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            data-testid="primary-action-btn"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{config.actionButtonText}</span>
                {hasFiles && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-xs font-mono">
                    {files.length}
                  </span>
                )}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
