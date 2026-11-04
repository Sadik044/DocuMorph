import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { pathToFileURL } from 'url';

// Configure PDF.js worker for Node/jsdom test runner
try {
  const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} catch {
  // Ignore in environments where require is not available
}

// URL mocks for jsdom
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-${blob.size}`);
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  }
}

// Valid 1x1 JPEG bytes for jsdom canvas.toBlob mock
const MOCK_VALID_JPG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02,
  0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05,
  0x05, 0x04, 0x04, 0x05, 0x0a, 0x07, 0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c,
  0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d, 0x0e, 0x12, 0x10, 0x0d, 0x0e, 0x11,
  0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15,
  0x0c, 0x0f, 0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xff,
  0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
  0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda,
  0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9,
]);

// Canvas mocks for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.toBlob = function (
    callback: (blob: Blob | null) => void,
    type = 'image/jpeg'
  ) {
    const blob = new Blob([MOCK_VALID_JPG], { type });
    setTimeout(() => callback(blob), 0);
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function (contextId: string, ...args: any[]) {
    if (contextId === '2d') {
      return {
        canvas: this,
        fillStyle: '#000000',
        getTransform: () => new globalThis.DOMMatrix(),
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 10 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
        resetTransform: () => {},
      } as unknown as CanvasRenderingContext2D;
    }
    return origGetContext?.call(this, contextId, ...args) ?? null;
  };
}

// Image mock for jsdom
if (typeof Image !== 'undefined') {
  let srcVal = '';
  Object.defineProperty(Image.prototype, 'src', {
    set(s: string) {
      srcVal = s;
      setTimeout(() => {
        try {
          Object.defineProperty(this, 'naturalWidth', { value: 100, configurable: true, writable: true });
          Object.defineProperty(this, 'naturalHeight', { value: 100, configurable: true, writable: true });
          Object.defineProperty(this, 'width', { value: 100, configurable: true, writable: true });
          Object.defineProperty(this, 'height', { value: 100, configurable: true, writable: true });
        } catch {
          // Ignore
        }
        if (typeof this.onload === 'function') {
          this.onload();
        }
      }, 0);
    },
    get() {
      return srcVal;
    },
    configurable: true,
  });
}

// Tesseract.js mock for deterministic testing in Node/jsdom
vi.mock('tesseract.js', () => ({
  languages: {
    BEN: 'ben',
    ENG: 'eng',
  },
  createWorker: vi.fn(async (lang: string = 'eng', _oem?: any, options?: any) => {
    return {
      recognize: vi.fn(async (_image: any) => {
        if (options?.logger) {
          options.logger({ status: 'recognizing text', progress: 0.5 });
          options.logger({ status: 'done', progress: 1.0 });
        }
        let sampleText = 'DocuMorph OCR text recognized successfully from image.';
        if (lang === 'ben') {
          sampleText = 'বাংলা অপটিক্যাল ক্যারেক্টার রিকগনিশন সফল হয়েছে।';
        } else if (lang === 'eng+ben') {
          sampleText = 'Document text in English and বাংলা মিশ্রিত পাঠ্য।';
        }
        return {
          data: {
            text: sampleText,
            confidence: 96,
          },
        };
      }),
      terminate: vi.fn(async () => {}),
    };
  }),
}));

