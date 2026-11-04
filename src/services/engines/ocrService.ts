import { createWorker, Worker } from 'tesseract.js';

export type OcrLanguage = 'eng' | 'ben' | 'eng+ben';

export interface OcrProgress {
  status: string;
  progress: number;
}

export type OcrProgressCallback = (progress: OcrProgress) => void;

let cachedWorker: Worker | null = null;
let cachedLanguage: string | null = null;
let activeProgressCallback: OcrProgressCallback | null = null;

/**
 * Retrieves an existing Tesseract worker or creates and initializes a new one.
 * Workers are cached by language to avoid redownloading/reinitializing models.
 */
export async function getOrCreateOcrWorker(
  lang: OcrLanguage = 'eng',
  onProgress?: OcrProgressCallback
): Promise<Worker> {
  activeProgressCallback = onProgress || null;

  if (cachedWorker && cachedLanguage === lang) {
    return cachedWorker;
  }

  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {
      // Ignore termination error
    }
    cachedWorker = null;
    cachedLanguage = null;
  }

  const worker = await createWorker(lang, undefined, {
    logger: (m) => {
      if (activeProgressCallback && typeof m.progress === 'number') {
        activeProgressCallback({
          status: m.status || 'Recognizing text...',
          progress: Math.min(1, Math.max(0, m.progress)),
        });
      }
    },
  });

  cachedWorker = worker;
  cachedLanguage = lang;
  return worker;
}

/**
 * Recognizes text from an image source (File, Blob, Canvas, or data URL) using OCR.
 */
export async function recognizeImageSource(
  source: string | HTMLCanvasElement | Blob | File | ImageData,
  lang: OcrLanguage = 'eng',
  onProgress?: OcrProgressCallback
): Promise<string> {
  const worker = await getOrCreateOcrWorker(lang, onProgress);
  activeProgressCallback = onProgress || null;
  const { data } = await worker.recognize(source as any);
  return (data?.text || '').trim();
}

/**
 * Terminates the active worker and releases memory.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {
      // Ignore
    }
    cachedWorker = null;
    cachedLanguage = null;
    activeProgressCallback = null;
  }
}
