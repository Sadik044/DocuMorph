import React from 'react';
import { ToolId } from '../../types/tool';
import { TOOLS_CONFIG, TOOL_ORDER } from '../../config/tools';
import { Layers, Image, FileImage, Minimize2, FileCode, ScanText, FileType } from 'lucide-react';

interface ToolTabsProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
}

const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
  'combine-pdf': <Layers className="w-4 h-4 mr-1.5" />,
  'jpg-to-pdf': <Image className="w-4 h-4 mr-1.5" />,
  'pdf-to-jpg': <FileImage className="w-4 h-4 mr-1.5" />,
  'compress-pdf': <Minimize2 className="w-4 h-4 mr-1.5" />,
  'pdf-to-word': <FileCode className="w-4 h-4 mr-1.5" />,
  'jpg-to-text': <ScanText className="w-4 h-4 mr-1.5" />,
  'pdf-to-text': <FileType className="w-4 h-4 mr-1.5" />,
};

export const ToolTabs: React.FC<ToolTabsProps> = ({ activeToolId, onSelectTool }) => {
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TOOL_ORDER.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TOOL_ORDER.length) % TOOL_ORDER.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = TOOL_ORDER.length - 1;
    }
    if (nextIndex !== -1) {
      e.preventDefault();
      const nextId = TOOL_ORDER[nextIndex];
      onSelectTool(nextId);
      const nextBtn = document.getElementById(`tab-${nextId}`);
      nextBtn?.focus();
    }
  };

  return (
    <nav
      className="bg-white border-b border-slate-200 px-4 sm:px-6 overflow-x-auto scrollbar-none"
      aria-label="PDF Tools Navigation"
    >
      <div
        className="max-w-5xl mx-auto flex items-center space-x-1 min-w-max py-1.5"
        role="tablist"
      >
        {TOOL_ORDER.map((id, index) => {
          const tool = TOOLS_CONFIG[id];
          const isActive = activeToolId === id;

          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectTool(id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={isActive ? 'text-brand-600' : 'text-slate-400'}>
                {TOOL_ICONS[id]}
              </span>
              <span className="hidden sm:inline">{tool.title}</span>
              <span className="sm:hidden">{tool.shortTitle}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
