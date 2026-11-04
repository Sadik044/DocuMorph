import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../../src/App';
import { TOOL_ORDER, TOOLS_CONFIG } from '../../src/config/tools';

describe('App Navigation and Startup', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('renders application branding and header elements', () => {
    render(<App />);
    expect(screen.getByText('Docu')).toBeInTheDocument();
    expect(screen.getByText('Morph')).toBeInTheDocument();
    expect(screen.getByText('PDF Tools')).toBeInTheDocument();
  });

  it('renders all tools in the navigation tablist', () => {
    render(<App />);
    TOOL_ORDER.forEach((id) => {
      const config = TOOLS_CONFIG[id];
      const tabButton = screen.getByRole('tab', { name: new RegExp(config.shortTitle, 'i') });
      expect(tabButton).toBeInTheDocument();
    });
  });

  it('defaults to Combine PDF as the initial active tool', () => {
    render(<App />);
    const activeTab = screen.getByRole('tab', { name: /Combine/i });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Combine PDF' })).toBeInTheDocument();
  });

  it('navigates cleanly between tools when tabs are clicked', () => {
    render(<App />);

    // Click JPG to PDF
    const jpgTab = screen.getByRole('tab', { name: /JPG → PDF/i });
    fireEvent.click(jpgTab);
    expect(screen.getByRole('heading', { level: 1, name: 'JPG to PDF' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#jpg-to-pdf');

    // Click PDF to JPG
    const pdfToJpgTab = screen.getByRole('tab', { name: /PDF → JPG/i });
    fireEvent.click(pdfToJpgTab);
    expect(screen.getByRole('heading', { level: 1, name: 'PDF to JPG' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#pdf-to-jpg');

    // Click Compress PDF
    const compressTab = screen.getByRole('tab', { name: /Compress/i });
    fireEvent.click(compressTab);
    expect(screen.getByRole('heading', { level: 1, name: 'Compress PDF' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#compress-pdf');

    // Click PDF to Word
    const wordTab = screen.getByRole('tab', { name: /PDF → Word/i });
    fireEvent.click(wordTab);
    expect(screen.getByRole('heading', { level: 1, name: 'PDF to Word' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#pdf-to-word');
  });

  it('renders privacy footer and client-side guarantees', () => {
    render(<App />);
    expect(screen.getByText(/Client-side PDF processing/i)).toBeInTheDocument();
    expect(screen.getByText(/never uploaded to any server/i)).toBeInTheDocument();
  });
});
