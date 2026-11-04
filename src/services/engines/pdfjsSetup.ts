import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

let isConfigured = false;

export function configurePdfjs(): typeof pdfjsLib {
  if (!isConfigured) {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }
    isConfigured = true;
  }
  return pdfjsLib;
}

export { pdfjsLib };
