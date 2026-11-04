import React from 'react';
import { FileText } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-13 sm:h-14">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Docu<span className="text-brand-600">Morph</span>
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                PDF Tools
              </span>
            </div>
          </div>

          {/* Simple Architecture Indicator */}
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Local In-Browser Processing</span>
          </div>
        </div>
      </div>
    </header>
  );
};
