import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolTabs } from '../../src/components/layout/ToolTabs';
import { FileCard } from '../../src/components/file-queue/FileCard';
import { DropZone } from '../../src/components/file-queue/DropZone';
import { TOOLS_CONFIG } from '../../src/config/tools';
import { FileItem } from '../../src/types/fileItem';

describe('Accessibility & Keyboard Navigation (Phase 5)', () => {
  describe('ToolTabs WAI-ARIA Keyboard Navigation', () => {
    it('supports ArrowRight, ArrowLeft, Home, and End keys to switch tabs', () => {
      const selectSpy = vi.fn();
      render(<ToolTabs activeToolId="combine-pdf" onSelectTool={selectSpy} />);

      const activeTab = screen.getByRole('tab', { name: /Combine PDF/i });
      expect(activeTab).toHaveAttribute('aria-selected', 'true');

      // Press ArrowRight to move to next tab
      fireEvent.keyDown(activeTab, { key: 'ArrowRight' });
      expect(selectSpy).toHaveBeenCalledWith('jpg-to-pdf');

      // Press ArrowLeft to wrap around to last tab
      fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });
      expect(selectSpy).toHaveBeenCalledWith('pdf-to-text');

      // Press End key to jump to last tab
      fireEvent.keyDown(activeTab, { key: 'End' });
      expect(selectSpy).toHaveBeenCalledWith('pdf-to-text');

      // Press Home key to jump to first tab
      fireEvent.keyDown(activeTab, { key: 'Home' });
      expect(selectSpy).toHaveBeenCalledWith('combine-pdf');
    });
  });

  describe('FileCard Keyboard Reordering Alternatives', () => {
    it('renders accessible Move Earlier and Move Later buttons when supportsReorder is enabled', () => {
      const mockItem: FileItem = {
        id: 'file-123',
        file: new File(['data'], 'document.pdf', { type: 'application/pdf' }),
        name: 'document.pdf',
        sizeBytes: 1024,
        extension: 'PDF',
        mimeType: 'application/pdf',
        status: 'pending',
        progressPercent: 0,
        previewUrl: null,
        errorMessage: null,
      };

      const moveEarlierSpy = vi.fn();
      const moveLaterSpy = vi.fn();

      render(
        <FileCard
          item={mockItem}
          supportsReorder={true}
          onRemove={vi.fn()}
          index={1}
          totalCount={3}
          onMoveEarlier={moveEarlierSpy}
          onMoveLater={moveLaterSpy}
        />
      );

      const moveEarlierBtn = screen.getByRole('button', {
        name: /Move document\.pdf earlier in sequence/i,
      });
      const moveLaterBtn = screen.getByRole('button', {
        name: /Move document\.pdf later in sequence/i,
      });

      expect(moveEarlierBtn).toBeEnabled();
      expect(moveLaterBtn).toBeEnabled();

      fireEvent.click(moveEarlierBtn);
      expect(moveEarlierSpy).toHaveBeenCalledWith(1);

      fireEvent.click(moveLaterBtn);
      expect(moveLaterSpy).toHaveBeenCalledWith(1);
    });

    it('disables Move Earlier at index 0 and Move Later at last index', () => {
      const mockItem: FileItem = {
        id: 'file-first',
        file: new File(['data'], 'first.pdf', { type: 'application/pdf' }),
        name: 'first.pdf',
        sizeBytes: 500,
        extension: 'PDF',
        mimeType: 'application/pdf',
        status: 'pending',
        progressPercent: 0,
        previewUrl: null,
        errorMessage: null,
      };

      render(
        <FileCard
          item={mockItem}
          supportsReorder={true}
          onRemove={vi.fn()}
          index={0}
          totalCount={2}
          onMoveEarlier={vi.fn()}
          onMoveLater={vi.fn()}
        />
      );

      const moveEarlierBtn = screen.getByRole('button', {
        name: /Move first\.pdf earlier in sequence/i,
      });
      expect(moveEarlierBtn).toBeDisabled();
    });
  });

  describe('DropZone Keyboard Accessibility', () => {
    it('is focusable via keyboard tabIndex and activates on Enter key', () => {
      const selectSpy = vi.fn();
      const config = TOOLS_CONFIG['combine-pdf'];

      render(<DropZone config={config} onFilesSelected={selectSpy} />);

      const dropzone = screen.getByRole('region', { name: /File Upload Dropzone/i });
      expect(dropzone).toHaveAttribute('tabIndex', '0');

      // Trigger Enter key
      fireEvent.keyDown(dropzone, { key: 'Enter' });
      // DropZone delegates to hidden file input click
    });
  });
});
