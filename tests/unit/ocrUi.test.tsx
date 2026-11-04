import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../../src/App';
import { createSyntheticJpg, createSyntheticPdf } from '../helpers/syntheticFiles';

describe('OCR UI Integration (Tools 6 & 7)', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('renders JPG to Text tool and allows language selection', () => {
    render(<App />);

    const tab = screen.getByRole('tab', { name: /JPG → Text/i });
    fireEvent.click(tab);

    expect(screen.getByRole('heading', { level: 1, name: /JPG to Text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bengali/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /English \+ Bengali/i })).toBeInTheDocument();

    // Click Bengali
    const benBtn = screen.getByRole('button', { name: /^Bengali/i });
    fireEvent.click(benBtn);
    expect(benBtn).toHaveClass('bg-brand-600');
  });

  it('renders PDF to Text tool with extraction mode, language selection, and page range input', () => {
    render(<App />);

    const tab = screen.getByRole('tab', { name: /PDF → Text/i });
    fireEvent.click(tab);

    expect(screen.getByRole('heading', { level: 1, name: /PDF to Text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Auto \(Smart Detect\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Direct Digital/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Force OCR/i })).toBeInTheDocument();

    const pageRangeInput = screen.getByLabelText(/Page Range/i);
    expect(pageRangeInput).toBeInTheDocument();
    expect(pageRangeInput).toHaveValue('all');

    // Change page range
    fireEvent.change(pageRangeInput, { target: { value: '1-3' } });
    expect(pageRangeInput).toHaveValue('1-3');
  });

  it('processes image in JPG to Text, displays editable text area, and updates stats on edit', async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<App />);

    // Switch to JPG to Text
    const tab = screen.getByRole('tab', { name: /JPG → Text/i });
    fireEvent.click(tab);

    // Upload an image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testJpg = createSyntheticJpg('receipt.jpg');
    fireEvent.change(fileInput, { target: { files: [testJpg] } });

    // File card should appear
    expect(await screen.findByText('receipt.jpg')).toBeInTheDocument();

    // Click primary action button "EXTRACT TEXT (OCR)"
    const processBtn = screen.getByTestId('primary-action-btn');
    expect(processBtn).toHaveTextContent(/EXTRACT TEXT/i);
    fireEvent.click(processBtn);

    // Extracted text card should appear
    const textarea = (await screen.findByTestId('extracted-textarea')) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('DocuMorph OCR text recognized');

    // Check stats badges
    expect(screen.getByText(/Words/i)).toBeInTheDocument();
    expect(screen.getByText(/Characters/i)).toBeInTheDocument();

    // Check action buttons inside text card
    const copyBtn = screen.getByTestId('copy-text-btn');
    const downloadTxtBtn = screen.getByTestId('download-txt-btn');
    expect(copyBtn).toBeInTheDocument();
    expect(downloadTxtBtn).toBeInTheDocument();

    // Test copy button feedback
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textarea.value);
    expect(await screen.findByText('Copied!')).toBeInTheDocument();

    // Test editing textarea
    fireEvent.change(textarea, { target: { value: 'Custom edited text with five words' } });
    expect(textarea.value).toBe('Custom edited text with five words');
    expect(screen.getByText('6 Words')).toBeInTheDocument();
  });

  it('extracts digital text in PDF to Text and renders the result card', async () => {
    render(<App />);

    const tab = screen.getByRole('tab', { name: /PDF → Text/i });
    fireEvent.click(tab);

    const pdf = await createSyntheticPdf(1, 'SampleDoc');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [pdf] } });

    expect(await screen.findByText('SampleDoc.pdf')).toBeInTheDocument();

    const processBtn = screen.getByTestId('primary-action-btn');
    fireEvent.click(processBtn);

    const textarea = (await screen.findByTestId('extracted-textarea')) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('SampleDoc - Page 1');
  });
});
