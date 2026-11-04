import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileItem } from '../../types/fileItem';
import { formatFileSize } from '../../services/fileValidator';
import { 
  X, 
  GripVertical, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface FileCardProps {
  item: FileItem;
  supportsReorder: boolean;
  onRemove: (id: string) => void;
  onDownloadIndividual?: (id: string) => void;
  index: number;
  totalCount?: number;
  onMoveEarlier?: (index: number) => void;
  onMoveLater?: (index: number) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  item,
  supportsReorder,
  onRemove,
  onDownloadIndividual,
  index,
  totalCount = 1,
  onMoveEarlier,
  onMoveLater,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !supportsReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isImage = item.mimeType.startsWith('image/') || ['JPG', 'JPEG', 'PNG', 'WEBP', 'BMP'].includes(item.extension);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col justify-between w-38 sm:w-44 h-52 bg-white rounded-lg border p-2.5 shadow-2xs select-none transition-all flex-shrink-0 ${
        isDragging
          ? 'opacity-50 ring-2 ring-brand-500 shadow-lg z-20 cursor-grabbing'
          : 'border-slate-200 hover:border-slate-300'
      } ${item.status === 'error' ? 'border-rose-300 bg-rose-50/20' : ''}`}
      data-testid={`file-card-${item.id}`}
    >
      {/* Header: Sequence Badge, Reorder controls & Remove Button */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center space-x-1">
          {supportsReorder && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-slate-600 rounded"
              title="Drag to reorder page sequence"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
            {index + 1}
          </span>
          {supportsReorder && onMoveEarlier && onMoveLater && totalCount > 1 && (
            <div className="flex items-center space-x-0.5 ml-0.5">
              <button
                type="button"
                onClick={() => onMoveEarlier(index)}
                disabled={index === 0}
                className="p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none rounded focus-visible:ring-1 focus-visible:ring-brand-500"
                title="Move earlier in queue"
                aria-label={`Move ${item.name} earlier in sequence`}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onMoveLater(index)}
                disabled={index >= totalCount - 1}
                className="p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none rounded focus-visible:ring-1 focus-visible:ring-brand-500"
                title="Move later in queue"
                aria-label={`Move ${item.name} later in sequence`}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Remove file"
          aria-label={`Remove ${item.name}`}
          data-testid={`remove-file-${item.id}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Middle: Preview / Thumbnail / Icon */}
      <div className="flex-1 flex flex-col items-center justify-center my-1.5 overflow-hidden relative rounded-md bg-slate-50 border border-slate-100">
        {item.previewUrl ? (
          <img
            src={item.previewUrl}
            alt={item.name}
            className="w-full h-full object-contain p-1"
          />
        ) : isImage ? (
          <ImageIcon className="w-8 h-8 text-brand-400 stroke-[1.5]" />
        ) : (
          <FileText className="w-8 h-8 text-slate-400 stroke-[1.5]" />
        )}

        {/* State Overlay */}
        {item.status === 'processing' && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-2xs flex flex-col items-center justify-center p-2 text-center">
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin mb-1" />
            <span className="text-xs font-semibold text-slate-700">Processing...</span>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-brand-600 h-full transition-all duration-300"
                style={{ width: `${item.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {item.status === 'done' && (
          <div className="absolute top-1.5 right-1.5 flex items-center space-x-1">
            {item.outputUrl && onDownloadIndividual && (
              <button
                type="button"
                onClick={() => onDownloadIndividual(item.id)}
                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition-colors"
                title="Download this converted file"
                aria-label={`Download ${item.name}`}
              >
                <Download className="w-3 h-3" />
              </button>
            )}
            <div className="bg-emerald-500 text-white rounded-full p-0.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {item.status === 'error' && (
          <div className="absolute inset-0 bg-rose-50/95 flex flex-col items-center justify-center p-2 text-center text-rose-700">
            <AlertCircle className="w-5 h-5 mb-1 text-rose-600" />
            <span className="text-xs font-medium leading-tight line-clamp-2">
              {item.errorMessage || 'Validation Error'}
            </span>
          </div>
        )}
      </div>

      {/* Footer: Truncated Name & Size */}
      <div className="pt-1.5 border-t border-slate-100">
        <p
          className="text-xs font-semibold text-slate-800 truncate"
          title={item.name}
        >
          {item.name}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-0.5">
          <span className="font-mono text-xs uppercase px-1 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
            {item.extension || 'FILE'}
          </span>
          <span>{formatFileSize(item.sizeBytes)}</span>
        </div>
      </div>
    </li>
  );
};
