import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolView } from '../../src/features/ToolView';
import { TOOLS_CONFIG } from '../../src/config/tools';

describe('Shared File Queue & Controls', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders empty queue state by default', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    render(<ToolView config={config} />);

    expect(screen.getByText('No files in queue')).toBeInTheDocument();
    expect(screen.getByTestId('clear-all-btn')).toBeDisabled();
    expect(screen.getByTestId('primary-action-btn')).toBeDisabled();
  });

  it('accepts valid uploaded files and renders file cards', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    render(<ToolView config={config} />);

    const input = screen.getByTestId('file-input');
    const mockFile1 = new File(['content1'], 'report-part1.pdf', {
      type: 'application/pdf',
    });
    const mockFile2 = new File(['content2'], 'report-part2.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [mockFile1, mockFile2] } });

    expect(screen.queryByText('No files in queue')).not.toBeInTheDocument();
    expect(screen.getByText('report-part1.pdf')).toBeInTheDocument();
    expect(screen.getByText('report-part2.pdf')).toBeInTheDocument();

    expect(screen.getByTestId('clear-all-btn')).toBeEnabled();
    expect(screen.getByTestId('primary-action-btn')).toBeEnabled();
  });

  it('removes individual files when remove button is clicked', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    render(<ToolView config={config} />);

    const input = screen.getByTestId('file-input');
    const file = new File(['content'], 'to-remove.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('to-remove.pdf')).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', { name: /Remove to-remove\.pdf/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText('to-remove.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('No files in queue')).toBeInTheDocument();
  });

  it('clears all files when Clear All is clicked', () => {
    const config = TOOLS_CONFIG['combine-pdf'];
    render(<ToolView config={config} />);

    const input = screen.getByTestId('file-input');
    const f1 = new File(['1'], 'doc1.pdf', { type: 'application/pdf' });
    const f2 = new File(['2'], 'doc2.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [f1, f2] } });

    expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
    expect(screen.getByText('doc2.pdf')).toBeInTheDocument();

    const clearBtn = screen.getByTestId('clear-all-btn');
    fireEvent.click(clearBtn);

    expect(screen.queryByText('doc1.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('doc2.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('No files in queue')).toBeInTheDocument();
  });

  it('shows honest architectural notice when an engine is configured as planned', () => {
    const plannedConfig = {
      ...TOOLS_CONFIG['compress-pdf'],
      engineStatus: 'planned' as const,
    };
    render(<ToolView config={plannedConfig} />);

    const input = screen.getByTestId('file-input');
    const f = new File(['1'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [f] } });

    const actionBtn = screen.getByTestId('primary-action-btn');
    fireEvent.click(actionBtn);

    const notice = screen.getByTestId('dev-notice');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/Compress PDF processing engine is scheduled for Phase 4/i);
  });

  it('executes real PDF compression when primary action is clicked for Compress PDF', async () => {
    const { createSyntheticPdf } = await import('../helpers/syntheticFiles');
    const pdf = await createSyntheticPdf(2, 'ReportToCompress');

    const config = TOOLS_CONFIG['compress-pdf'];
    render(<ToolView config={config} />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [pdf] } });

    const actionBtn = screen.getByTestId('primary-action-btn');
    fireEvent.click(actionBtn);

    const downloadBtn = await screen.findByTestId('download-result-btn');
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent(/DOWNLOAD (COMPRESSED|OPTIMIZED) PDF/i);
    expect(screen.getByTestId('compression-result-card')).toBeInTheDocument();
  });

  it('executes real PDF to DOCX conversion when primary action is clicked for PDF to Word', async () => {
    const { createSyntheticPdf } = await import('../helpers/syntheticFiles');
    const pdf = await createSyntheticPdf(1, 'ResumeToDocx');

    const config = TOOLS_CONFIG['pdf-to-word'];
    render(<ToolView config={config} />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [pdf] } });

    const actionBtn = screen.getByTestId('primary-action-btn');
    fireEvent.click(actionBtn);

    const downloadBtn = await screen.findByTestId('download-result-btn');
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent(/DOWNLOAD WORD DOCUMENT/i);
  });

  it('executes real PDF merge when primary action is clicked for Combine PDF', async () => {
    const { createSyntheticPdf } = await import('../helpers/syntheticFiles');
    const pdf1 = await createSyntheticPdf(1, 'DocA');
    const pdf2 = await createSyntheticPdf(2, 'DocB');

    const config = TOOLS_CONFIG['combine-pdf'];
    render(<ToolView config={config} />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [pdf1, pdf2] } });

    const actionBtn = screen.getByTestId('primary-action-btn');
    fireEvent.click(actionBtn);

    // Wait for download button to appear
    const downloadBtn = await screen.findByTestId('download-result-btn');
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent(/DOWNLOAD COMBINED PDF \(3 PAGES\)/i);
  });
});
