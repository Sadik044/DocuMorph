import React from 'react';
import { Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-slate-500 text-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <p className="font-medium text-slate-700">
            © {new Date().getFullYear()} DocuMorph. Client-side PDF processing.
          </p>
          <p className="text-slate-500 mt-0.5">
            Files are transformed directly on your device via WebAssembly and are never uploaded to any server.
          </p>
        </div>
        <div className="flex items-center space-x-1 text-slate-500 font-medium shrink-0">
          <Lock className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span>Local In-Memory Execution</span>
        </div>
      </div>
    </footer>
  );
};
