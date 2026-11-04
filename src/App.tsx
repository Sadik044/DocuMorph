import React, { useState, useEffect } from 'react';
import { ToolId } from './types/tool';
import { TOOLS_CONFIG, TOOL_ORDER } from './config/tools';
import { Header } from './components/layout/Header';
import { ToolTabs } from './components/layout/ToolTabs';
import { Footer } from './components/layout/Footer';
import { ToolView } from './features/ToolView';

export const App: React.FC = () => {
  // Sync state with URL hash
  const getInitialTool = (): ToolId => {
    const hash = window.location.hash.replace('#', '') as ToolId;
    return TOOL_ORDER.includes(hash) ? hash : 'combine-pdf';
  };

  const [activeToolId, setActiveToolId] = useState<ToolId>(getInitialTool);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ToolId;
      if (TOOL_ORDER.includes(hash)) {
        setActiveToolId(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTool = (id: ToolId) => {
    setActiveToolId(id);
    window.location.hash = id;
  };

  const currentToolConfig = TOOLS_CONFIG[activeToolId];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header />
      <ToolTabs activeToolId={activeToolId} onSelectTool={handleSelectTool} />
      <main className="flex-1">
        <ToolView key={activeToolId} config={currentToolConfig} />
      </main>
      <Footer />
    </div>
  );
};

export default App;
