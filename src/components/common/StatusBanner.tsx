import React from 'react';
import { AlertCircle, Info, X } from 'lucide-react';
import { ValidationError } from '../../types/fileItem';

interface StatusBannerProps {
  errors: ValidationError[];
  onDismissError: (index: number) => void;
  devNotice?: string | null;
  onDismissDevNotice?: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  errors,
  onDismissError,
  devNotice,
  onDismissDevNotice,
}) => {
  return (
    <div className="space-y-2 mb-4">
      {/* Validation Errors */}
      {errors.map((err, idx) => (
        <div
          key={`${err.code}-${idx}`}
          className="flex items-start justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium animate-fadeIn"
          role="alert"
        >
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{err.message}</p>
              {err.fileName && (
                <p className="text-[11px] text-rose-600 mt-0.5 font-mono">
                  Target: {err.fileName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismissError(idx)}
            className="p-1 text-rose-500 hover:text-rose-800 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Honest Architecture & Phase Notice */}
      {devNotice && (
        <div
          className="flex items-start justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs animate-fadeIn"
          role="status"
          data-testid="dev-notice"
        >
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-900">Phase 2 Architectural Notice</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">{devNotice}</p>
            </div>
          </div>
          {onDismissDevNotice && (
            <button
              type="button"
              onClick={onDismissDevNotice}
              className="p-1 text-amber-600 hover:text-amber-900 rounded transition-colors"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
