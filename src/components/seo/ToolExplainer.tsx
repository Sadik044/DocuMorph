import React from 'react';
import { ToolConfig } from '../../types/tool';

interface ToolExplainerProps {
  config: ToolConfig;
}

export const ToolExplainer: React.FC<ToolExplainerProps> = ({ config }) => {
  return (
    <div className="mt-8 pt-6 border-t border-slate-200 text-slate-700 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Tool Details & Purpose */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            About {config.title}
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            {config.description}
          </p>
          <div className="pt-2 text-xs text-slate-500">
            <span>Accepted formats: <strong className="text-slate-700">{config.acceptedExtensions.join(', ')}</strong></span>
            <span className="mx-2">•</span>
            <span>Max file size: <strong className="text-slate-700">50 MB</strong></span>
          </div>
        </div>

        {/* Right Column: How to Use */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">
            How to use this tool
          </h3>
          <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside leading-relaxed">
            <li>
              <span className="font-medium text-slate-800">Add files:</span> Drop files above or browse from your device.
            </li>
            {config.supportsReorder && (
              <li>
                <span className="font-medium text-slate-800">Reorder sequence:</span> Drag cards or use the arrow buttons to arrange pages.
              </li>
            )}
            <li>
              <span className="font-medium text-slate-800">Process:</span> Click "{config.actionButtonText}" to generate your {config.outputFormat} file.
            </li>
            <li>
              <span className="font-medium text-slate-800">Download:</span> Save the converted file directly to your local storage.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
