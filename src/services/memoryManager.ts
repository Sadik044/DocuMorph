import { FileItem } from '../types/fileItem';

class MemoryManager {
  private activeUrls: Set<string> = new Set();

  public trackUrl(url: string | null | undefined): void {
    if (url && url.startsWith('blob:')) {
      this.activeUrls.add(url);
    }
  }

  public revokeUrl(url: string | null | undefined): void {
    if (url && this.activeUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('Failed to revoke object URL:', err);
      }
      this.activeUrls.delete(url);
    }
  }

  public cleanupFileItem(item: FileItem): void {
    if (item.previewUrl) {
      this.revokeUrl(item.previewUrl);
      item.previewUrl = null;
    }
    if (item.outputUrl) {
      this.revokeUrl(item.outputUrl);
      item.outputUrl = null;
    }
  }

  public cleanupAllFiles(items: FileItem[]): void {
    items.forEach((item) => this.cleanupFileItem(item));
    this.activeUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    this.activeUrls.clear();
  }
}

export const memoryManager = new MemoryManager();
