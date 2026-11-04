import { OcrLanguage, recognizeImageSource } from './ocrService';

export interface ImageToTextOptions {
  lang?: OcrLanguage;
  onProgress?: (percent: number, message: string) => void;
  outputFileName?: string;
}

export interface ImageFileResult {
  fileName: string;
  text: string;
  wordCount: number;
  charCount: number;
}

export interface ImageToTextResult {
  text: string;
  wordCount: number;
  charCount: number;
  fileResults: ImageFileResult[];
  blob: Blob;
  url: string;
  fileName: string;
}

/**
 * Calculates word count from a text string.
 */
export function calculateWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Extracts text from one or more images using Tesseract.js OCR.
 */
export async function extractTextFromImages(
  files: File[],
  options: ImageToTextOptions = {}
): Promise<ImageToTextResult> {
  const { lang = 'eng', onProgress, outputFileName } = options;

  if (files.length === 0) {
    throw new Error('No image files provided for OCR extraction.');
  }

  const fileResults: ImageFileResult[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const baseProgress = Math.round((i / totalFiles) * 100);
    const progressSpan = Math.round(100 / totalFiles);

    onProgress?.(
      baseProgress,
      `[${i + 1}/${totalFiles}] Initializing OCR for ${file.name}...`
    );

    const rawText = await recognizeImageSource(file, lang, (p) => {
      const currentPercent = Math.min(
        99,
        Math.round(baseProgress + p.progress * progressSpan)
      );
      onProgress?.(
        currentPercent,
        `[${i + 1}/${totalFiles}] ${p.status || 'Extracting text...'} (${Math.round(
          p.progress * 100
        )}%)`
      );
    });

    const cleanText = rawText.trim();
    fileResults.push({
      fileName: file.name,
      text: cleanText,
      wordCount: calculateWordCount(cleanText),
      charCount: cleanText.length,
    });
  }

  // Combine results
  let combinedText = '';
  if (fileResults.length === 1) {
    combinedText = fileResults[0].text;
  } else {
    combinedText = fileResults
      .map((res) => `--- File: ${res.fileName} ---\n\n${res.text}`)
      .join('\n\n\n');
  }

  const totalWords = calculateWordCount(combinedText);
  const totalChars = combinedText.length;

  // Generate downloadable .txt Blob with UTF-8 BOM for proper Unicode (e.g. Bengali) rendering
  const blob = new Blob(['\uFEFF' + combinedText], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);

  const defaultName =
    files.length === 1
      ? `${files[0].name.replace(/\.[^.]+$/, '')}-ocr.txt`
      : 'documorph-extracted-text.txt';

  onProgress?.(100, 'OCR text extraction complete.');

  return {
    text: combinedText,
    wordCount: totalWords,
    charCount: totalChars,
    fileResults,
    blob,
    url,
    fileName: outputFileName || defaultName,
  };
}
