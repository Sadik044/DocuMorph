import React, { useState, useEffect } from 'react';
import { ToolConfig } from '../types/tool';
import { FileItem, ValidationError } from '../types/fileItem';
import { validateIncomingFiles, formatFileSize } from '../services/fileValidator';
import { memoryManager } from '../services/memoryManager';
import { DropZone } from '../components/file-queue/DropZone';
import { FileCarousel } from '../components/file-queue/FileCarousel';
import { ActionControls, DownloadResultData } from '../components/file-queue/ActionControls';
import { StatusBanner } from '../components/common/StatusBanner';
import { ToolExplainer } from '../components/seo/ToolExplainer';
import { mergePdfFiles } from '../services/engines/pdfMergeEngine';
import { convertImagesToPdf } from '../services/engines/imageToPdfEngine';
import { convertPdfToImages, RenderedPage } from '../services/engines/pdfToImageEngine';
import {
  compressPdfFile,
  CompressionLevel,
  CompressPdfResult,
} from '../services/engines/pdfCompressEngine';
import { convertPdfToDocx, PdfToDocxResult } from '../services/engines/pdfToDocxEngine';
import {
  Download,
  Sliders,
  FileImage,
  FileCheck2,
  AlertTriangle,
  Info,
  TrendingDown,
  Copy,
  Check,
  Languages,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  extractTextFromImages,
  calculateWordCount,
} from '../services/engines/imageToTextEngine';
import {
  extractTextFromPdf,
  PdfExtractionMode,
} from '../services/engines/pdfToTextEngine';
import { OcrLanguage } from '../services/engines/ocrService';

interface ToolViewProps {
  config: ToolConfig;
}

export const ToolView: React.FC<ToolViewProps> = ({ config }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<{ percent: number; message: string } | null>(
    null
  );
  const [downloadResult, setDownloadResult] = useState<DownloadResultData | null>(null);

  // Tool 2 options (JPG to PDF)
  const [jpgPageSize, setJpgPageSize] = useState<'fit-image' | 'a4'>('fit-image');

  // Tool 3 options (PDF to JPG)
  const [imgFormat, setImgFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [imgScale, setImgScale] = useState<number>(1.5);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);

  // Tool 4 options (Compress PDF)
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('balanced');
  const [compressionResult, setCompressionResult] = useState<CompressPdfResult | null>(null);

  // Tool 5 options & results (PDF to Word)
  const [docxResult, setDocxResult] = useState<PdfToDocxResult | null>(null);

  // Tools 6 & 7 (OCR & Text Extraction)
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>('eng');
  const [pdfTextMode, setPdfTextMode] = useState<PdfExtractionMode>('auto');
  const [pdfPageRange, setPdfPageRange] = useState<string>('all');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractedStats, setExtractedStats] = useState<{
    wordCount: number;
    charCount: number;
    method?: string;
    fileName?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [textBlobUrl, setTextBlobUrl] = useState<string | null>(null);

  // Clean up object URLs when the tool view unmounts or changes
  useEffect(() => {
    return () => {
      memoryManager.cleanupAllFiles(files);
      if (downloadResult?.url) {
        memoryManager.revokeUrl(downloadResult.url);
      }
      renderedPages.forEach((p) => memoryManager.revokeUrl(p.url));
      if (compressionResult?.url) {
        memoryManager.revokeUrl(compressionResult.url);
      }
      if (docxResult?.url) {
        memoryManager.revokeUrl(docxResult.url);
      }
      if (textBlobUrl) {
        memoryManager.revokeUrl(textBlobUrl);
      }
    };
  }, [config.id]);

  const handleFilesSelected = (incomingFiles: File[]) => {
    const { validFiles, errors } = validateIncomingFiles(incomingFiles, files, config);

    if (errors.length > 0) {
      setValidationErrors((prev) => [...prev, ...errors]);
    }

    if (validFiles.length > 0) {
      validFiles.forEach((f) => memoryManager.trackUrl(f.previewUrl));
      setFiles((prev) => [...prev, ...validFiles]);
      setDevNotice(null);
      setDownloadResult(null);
      setRenderedPages([]);
      setCompressionResult(null);
      setDocxResult(null);
      setExtractedText(null);
      setExtractedStats(null);
      if (textBlobUrl) {
        memoryManager.revokeUrl(textBlobUrl);
        setTextBlobUrl(null);
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target) {
      memoryManager.cleanupFileItem(target);
    }
    const remaining = files.filter((f) => f.id !== id);
    setFiles(remaining);
    setDownloadResult(null);
    setCompressionResult(null);
    setDocxResult(null);
    if (remaining.length === 0) {
      setExtractedText(null);
      setExtractedStats(null);
      if (textBlobUrl) {
        memoryManager.revokeUrl(textBlobUrl);
        setTextBlobUrl(null);
      }
    }
  };

  const handleClearAll = () => {
    memoryManager.cleanupAllFiles(files);
    if (downloadResult?.url) {
      memoryManager.revokeUrl(downloadResult.url);
    }
    renderedPages.forEach((p) => memoryManager.revokeUrl(p.url));
    if (compressionResult?.url) {
      memoryManager.revokeUrl(compressionResult.url);
    }
    if (docxResult?.url) {
      memoryManager.revokeUrl(docxResult.url);
    }
    if (textBlobUrl) {
      memoryManager.revokeUrl(textBlobUrl);
      setTextBlobUrl(null);
    }
    setFiles([]);
    setValidationErrors([]);
    setDevNotice(null);
    setDownloadResult(null);
    setRenderedPages([]);
    setCompressionResult(null);
    setDocxResult(null);
    setExtractedText(null);
    setExtractedStats(null);
    setIsCopied(false);
    setProcessProgress(null);
  };

  const handleFilesReordered = (reordered: FileItem[]) => {
    setFiles(reordered);
    setDownloadResult(null);
  };

  const handleDismissError = (index: number) => {
    setValidationErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadIndividual = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target && target.outputUrl) {
      const a = document.createElement('a');
      a.href = target.outputUrl;
      a.download = target.name.endsWith('.pdf') ? target.name : `${target.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCopyText = async () => {
    if (extractedText === null) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(extractedText);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = extractedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadText = () => {
    if (extractedText === null) return;
    const blob = new Blob(['\uFEFF' + extractedText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const fileName =
      extractedStats?.fileName ||
      `${files[0]?.name.replace(/\.[^.]+$/, '') || 'documorph'}-text.txt`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setExtractedText(newText);
    setExtractedStats((prev) => ({
      wordCount: calculateWordCount(newText),
      charCount: newText.length,
      method: prev?.method,
      fileName: prev?.fileName,
    }));
  };

  const handleProcessRequested = async () => {
    if (files.length === 0 || isProcessing) return;

    if (config.engineStatus !== 'ready') {
      setDevNotice(
        `${config.title} processing engine is scheduled for Phase 4 implementation. All active operations are performed locally.`
      );
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);
    setDevNotice(null);
    setDownloadResult(null);
    setRenderedPages([]);
    setCompressionResult(null);
    setDocxResult(null);
    setExtractedText(null);
    setExtractedStats(null);
    if (textBlobUrl) {
      memoryManager.revokeUrl(textBlobUrl);
      setTextBlobUrl(null);
    }

    // Mark queued files as processing
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: 'processing', progressPercent: 10, errorMessage: null }))
    );

    try {
      // Tool 1: Combine PDF
      if (config.id === 'combine-pdf') {
        const result = await mergePdfFiles(
          files.map((f) => f.file),
          {
            outputFileName: 'combined-document.pdf',
            onProgress: (percent, msg) => {
              setProcessProgress({ percent, message: msg });
              setFiles((prev) =>
                prev.map((f) => ({ ...f, progressPercent: Math.min(percent, 95) }))
              );
            },
          }
        );

        memoryManager.trackUrl(result.url);

        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: 'done', progressPercent: 100 }))
        );

        setDownloadResult({
          url: result.url,
          fileName: result.fileName,
          byteSize: result.byteSize,
          pageCount: result.pageCount,
          label: `DOWNLOAD COMBINED PDF (${result.pageCount} PAGES)`,
        });
      }

      // Tool 2: JPG to PDF
      else if (config.id === 'jpg-to-pdf') {
        const updatedFiles: FileItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const item = files[i];
          const singleResult = await convertImagesToPdf([item.file], {
            pageSize: jpgPageSize,
            outputFileName: `${item.name}.pdf`,
          });
          memoryManager.trackUrl(singleResult.url);
          updatedFiles.push({
            ...item,
            status: 'done',
            progressPercent: 100,
            outputUrl: singleResult.url,
            outputSizeBytes: singleResult.byteSize,
          });
        }
        setFiles(updatedFiles);

        const combinedResult = await convertImagesToPdf(
          files.map((f) => f.file),
          {
            pageSize: jpgPageSize,
            outputFileName: 'combined-images.pdf',
            onProgress: (percent, msg) => {
              setProcessProgress({ percent, message: msg });
            },
          }
        );

        memoryManager.trackUrl(combinedResult.url);

        setDownloadResult({
          url: combinedResult.url,
          fileName: combinedResult.fileName,
          byteSize: combinedResult.byteSize,
          pageCount: combinedResult.pageCount,
          label: `DOWNLOAD COMBINED PDF (${combinedResult.pageCount} PAGES)`,
        });
      }

      // Tool 3: PDF to JPG
      else if (config.id === 'pdf-to-jpg') {
        const result = await convertPdfToImages(files[0].file, {
          format: imgFormat,
          scale: imgScale,
          createZip: true,
          onProgress: (percent, msg) => {
            setProcessProgress({ percent, message: msg });
            setFiles((prev) =>
              prev.map((f) => ({ ...f, progressPercent: Math.min(percent, 95) }))
            );
          },
        });

        result.pages.forEach((p) => memoryManager.trackUrl(p.url));
        if (result.zipUrl) memoryManager.trackUrl(result.zipUrl);

        setRenderedPages(result.pages);

        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: 'done', progressPercent: 100 }))
        );

        if (result.zipUrl && result.zipBlob) {
          setDownloadResult({
            url: result.zipUrl,
            fileName: result.zipFileName || 'document-images.zip',
            byteSize: result.zipBlob.size,
            pageCount: result.totalPages,
            label: `DOWNLOAD ALL (${result.totalPages} PAGES AS ZIP)`,
          });
        } else if (result.pages.length === 1) {
          setDownloadResult({
            url: result.pages[0].url,
            fileName: result.pages[0].fileName,
            byteSize: result.pages[0].byteSize,
            pageCount: 1,
            label: `DOWNLOAD PAGE IMAGE (${imgFormat.toUpperCase()})`,
          });
        }
      }

      // Tool 4: Compress PDF
      else if (config.id === 'compress-pdf') {
        const result = await compressPdfFile(files[0].file, {
          level: compressionLevel,
          onProgress: (percent, msg) => {
            setProcessProgress({ percent, message: msg });
            setFiles((prev) =>
              prev.map((f) => ({ ...f, progressPercent: Math.min(percent, 95) }))
            );
          },
        });

        memoryManager.trackUrl(result.url);
        setCompressionResult(result);

        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            status: 'done',
            progressPercent: 100,
            reductionPercent: result.reductionPercent,
            outputSizeBytes: result.outputBytes,
          }))
        );

        setDownloadResult({
          url: result.url,
          fileName: result.fileName,
          byteSize: result.outputBytes,
          pageCount: result.pageCount,
          label: result.isReductionAchieved
            ? `DOWNLOAD COMPRESSED PDF (-${result.reductionPercent}%)`
            : `DOWNLOAD OPTIMIZED PDF (${formatFileSize(result.outputBytes)})`,
        });
      }

      // Tool 5: PDF to Word (DOCX)
      else if (config.id === 'pdf-to-word') {
        const result = await convertPdfToDocx(files[0].file, {
          onProgress: (percent, msg) => {
            setProcessProgress({ percent, message: msg });
            setFiles((prev) =>
              prev.map((f) => ({ ...f, progressPercent: Math.min(percent, 95) }))
            );
          },
        });

        memoryManager.trackUrl(result.url);
        setDocxResult(result);

        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: 'done', progressPercent: 100, outputUrl: result.url }))
        );

        setDownloadResult({
          url: result.url,
          fileName: result.fileName,
          byteSize: result.byteSize,
          pageCount: result.pageCount,
          label: 'DOWNLOAD WORD DOCUMENT (.DOCX)',
        });
      }

      // Tool 6: JPG to Text (OCR)
      else if (config.id === 'jpg-to-text') {
        const result = await extractTextFromImages(
          files.map((f) => f.file),
          {
            lang: ocrLanguage,
            onProgress: (percent, msg) => {
              setProcessProgress({ percent, message: msg });
              setFiles((prev) =>
                prev.map((f) => ({ ...f, progressPercent: Math.min(percent, 95) }))
              );
            },
          }
        );

        memoryManager.trackUrl(result.url);
        setTextBlobUrl(result.url);
        setExtractedText(result.text);
        setExtractedStats({
          wordCount: result.wordCount,
          charCount: result.charCount,
          method: 'ocr',
          fileName: result.fileName,
        });

        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: 'done', progressPercent: 100, outputUrl: result.url }))
        );

        setDownloadResult({
          url: result.url,
          fileName: result.fileName,
          byteSize: result.blob.size,
          label: 'DOWNLOAD EXTRACTED TEXT (.TXT)',
        });
      }

      // Tool 7: PDF to Text
      else if (config.id === 'pdf-to-text') {
        const result = await extractTextFromPdf(files[0].file, {
          mode: pdfTextMode,
          lang: ocrLanguage,
          pageRange: pdfPageRange,
          onProgress: (percent, msg) => {
            setProcessProgress({ percent, message: msg });
            setFiles((prev) =>
              prev.map((f) => ({ ...f, progressPercent: Math.min(percent, 95) }))
            );
          },
        });

        memoryManager.trackUrl(result.url);
        setTextBlobUrl(result.url);
        setExtractedText(result.text);
        setExtractedStats({
          wordCount: result.wordCount,
          charCount: result.charCount,
          method: result.method,
          fileName: result.fileName,
        });

        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: 'done', progressPercent: 100, outputUrl: result.url }))
        );

        const methodLabel =
          result.method === 'ocr'
            ? 'OCR'
            : result.method === 'digital'
            ? 'DIGITAL'
            : 'HYBRID';

        setDownloadResult({
          url: result.url,
          fileName: result.fileName,
          byteSize: result.blob.size,
          pageCount: result.processedPages.length,
          label: `DOWNLOAD EXTRACTED TEXT (${methodLabel})`,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setValidationErrors((prev) => [
        ...prev,
        {
          code: 'INVALID_TYPE',
          message: errorMsg,
        },
      ]);
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'error', errorMessage: errorMsg }))
      );
    } finally {
      setIsProcessing(false);
      setProcessProgress(null);
    }
  };

  return (
    <div
      role="tabpanel"
      id={`panel-${config.id}`}
      aria-labelledby={`tab-${config.id}`}
      className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6"
    >
      {/* Tool Header Summary */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {config.title}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">{config.tagline}</p>
      </div>

      {/* Status & Validation Banners */}
      <StatusBanner
        errors={validationErrors}
        onDismissError={handleDismissError}
        devNotice={devNotice}
        onDismissDevNotice={() => setDevNotice(null)}
      />

      {/* Main Workspace Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
        {/* Tool 2: JPG to PDF Options */}
        {config.id === 'jpg-to-pdf' && (
          <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700">
            <span className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Sliders className="w-4 h-4 text-brand-600" />
              Page Size:
            </span>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="jpgPageSize"
                  checked={jpgPageSize === 'fit-image'}
                  onChange={() => setJpgPageSize('fit-image')}
                  disabled={isProcessing}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>Fit Exact Image</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="jpgPageSize"
                  checked={jpgPageSize === 'a4'}
                  onChange={() => setJpgPageSize('a4')}
                  disabled={isProcessing}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>Standard A4 Document</span>
              </label>
            </div>
          </div>
        )}

        {/* Tool 3: PDF to JPG Options */}
        {config.id === 'pdf-to-jpg' && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700">
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Sliders className="w-4 h-4 text-brand-600" />
                Resolution:
              </span>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="imgScale"
                  checked={imgScale === 1.5}
                  onChange={() => setImgScale(1.5)}
                  disabled={isProcessing}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>Standard (150 DPI)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="imgScale"
                  checked={imgScale === 2.0}
                  onChange={() => setImgScale(2.0)}
                  disabled={isProcessing}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>High Quality (300 DPI)</span>
              </label>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-900">Format:</span>
              <button
                type="button"
                onClick={() => setImgFormat('jpeg')}
                disabled={isProcessing}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  imgFormat === 'jpeg'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                JPG
              </button>
              <button
                type="button"
                onClick={() => setImgFormat('png')}
                disabled={isProcessing}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  imgFormat === 'png'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                PNG
              </button>
            </div>
          </div>
        )}

        {/* Tool 4: Compress PDF Mode Selection */}
        {config.id === 'compress-pdf' && (
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  Compression Mode:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCompressionLevel('lossless')}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    compressionLevel === 'lossless'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Lossless (Structural)
                </button>
                <button
                  type="button"
                  onClick={() => setCompressionLevel('balanced')}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    compressionLevel === 'balanced'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Balanced (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setCompressionLevel('strong')}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    compressionLevel === 'strong'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Strong (Lossy Raster)
                </button>
              </div>
            </div>

            {/* Mode Explanations & Explicit Warnings */}
            {compressionLevel === 'lossless' && (
              <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 leading-relaxed">
                <strong>Lossless Mode:</strong> Compresses internal cross-reference tables and compacts object streams. Retains 100% of searchable text, vector sharpness, embedded fonts, and page visuals with zero quality loss.
              </p>
            )}
            {compressionLevel === 'balanced' && (
              <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 leading-relaxed">
                <strong>Balanced Mode:</strong> Evaluates structural optimization first. If structural compaction yields no reduction on files larger than 1 MB, it performs controlled fallback rasterization to reduce file size.
              </p>
            )}
            {compressionLevel === 'strong' && (
              <div className="text-xs text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 flex items-start space-x-2 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-amber-950">Lossy Rasterization Warning:</strong> Strong mode re-renders pages as bitmap images at 120 DPI. Vector graphics, selectable text, and hyperlinks will be converted to raster images. Ideal for scanned documents.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tool 5: PDF to Word Layout & OCR Information */}
        {config.id === 'pdf-to-word' && (
          <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 text-xs sm:text-sm text-blue-900 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-950">OpenXML Word Conversion</p>
              <p className="text-blue-800 mt-0.5 leading-relaxed text-xs">
                Extracts selectable text and reconstructs paragraphs, headings, and basic tables into editable Word (.docx) elements. Scanned image documents without embedded text layers will be detected.
              </p>
            </div>
          </div>
        )}

        {/* Tool 6: JPG to Text OCR Options */}
        {config.id === 'jpg-to-text' && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Languages className="w-4 h-4 text-brand-600" />
                Recognition Language:
              </span>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="OCR Language Selection">
                <button
                  type="button"
                  onClick={() => setOcrLanguage('eng')}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    ocrLanguage === 'eng'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setOcrLanguage('ben')}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    ocrLanguage === 'ben'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Bengali (বাংলা)
                </button>
                <button
                  type="button"
                  onClick={() => setOcrLanguage('eng+ben')}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    ocrLanguage === 'eng+ben'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  English + Bengali (বাংলা)
                </button>
              </div>
            </div>
            <span className="text-xs text-slate-500">
              In-browser OCR via Tesseract.js (cached offline after first use)
            </span>
          </div>
        )}

        {/* Tool 7: PDF to Text Options */}
        {config.id === 'pdf-to-text' && (
          <div className="space-y-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Language Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Languages className="w-4 h-4 text-brand-600" />
                  Language:
                </span>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="PDF Language Selection">
                  <button
                    type="button"
                    onClick={() => setOcrLanguage('eng')}
                    disabled={isProcessing}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      ocrLanguage === 'eng'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcrLanguage('ben')}
                    disabled={isProcessing}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      ocrLanguage === 'ben'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Bengali (বাংলা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcrLanguage('eng+ben')}
                    disabled={isProcessing}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      ocrLanguage === 'eng+ben'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    English + Bengali
                  </button>
                </div>
              </div>

              {/* Extraction Mode */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">Mode:</span>
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="PDF Extraction Mode">
                  <button
                    type="button"
                    onClick={() => setPdfTextMode('auto')}
                    disabled={isProcessing}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      pdfTextMode === 'auto'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Auto (Smart Detect)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfTextMode('digital')}
                    disabled={isProcessing}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      pdfTextMode === 'digital'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Direct Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfTextMode('ocr')}
                    disabled={isProcessing}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      pdfTextMode === 'ocr'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Force OCR (Scanned)
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Page Range & Guidance */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
              <div className="flex items-center space-x-2">
                <label htmlFor="pageRangeInput" className="font-semibold text-slate-900 text-xs">
                  Page Range:
                </label>
                <input
                  id="pageRangeInput"
                  type="text"
                  value={pdfPageRange}
                  onChange={(e) => setPdfPageRange(e.target.value)}
                  placeholder="all, 1-5, 2, 4"
                  disabled={isProcessing}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-2xs focus:ring-1 focus:ring-brand-500 focus:outline-none w-36 font-mono"
                />
                <span className="text-slate-500 text-xs">
                  (e.g., <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-700">all</code> or <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-700">1-3, 5</code>)
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Auto mode extracts fast digital text and activates OCR automatically for scanned pages
              </span>
            </div>
          </div>
        )}

        {/* Upload Drop Zone */}
        <DropZone
          config={config}
          onFilesSelected={handleFilesSelected}
          disabled={files.length >= config.maxFiles || isProcessing}
          hasFiles={files.length > 0}
        />

        {/* Active Progress Status Bar */}
        {processProgress && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 bg-brand-50/70 border border-brand-200 rounded-lg space-y-1.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-brand-900">
              <span>{processProgress.message}</span>
              <span>{processProgress.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={processProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={processProgress.message}
              className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"
            >
              <div
                className="bg-brand-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${processProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Carousel / Card Queue */}
        <FileCarousel
          files={files}
          supportsReorder={config.supportsReorder && !isProcessing}
          onFilesReordered={handleFilesReordered}
          onRemoveFile={handleRemoveFile}
          onDownloadIndividual={handleDownloadIndividual}
        />

        {/* Tool 4: Real Compression Statistics Card */}
        {compressionResult && (
          <div
            data-testid="compression-result-card"
            className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Actual Compression Results ({compressionResult.level.toUpperCase()} Mode)
              </h3>
              {compressionResult.isReductionAchieved ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  -{compressionResult.reductionPercent}% Size Reduction
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                  Already Optimized
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white rounded-md border border-slate-200">
                <span className="text-slate-500 block text-xs">Original Size</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {formatFileSize(compressionResult.originalBytes)}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-md border border-slate-200">
                <span className="text-slate-500 block text-xs">Compressed Size</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {formatFileSize(compressionResult.outputBytes)}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-md border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-xs">Savings</span>
                <span
                  className={`font-semibold text-sm ${
                    compressionResult.isReductionAchieved ? 'text-emerald-600' : 'text-slate-600'
                  }`}
                >
                  {compressionResult.isReductionAchieved
                    ? `Saved ${formatFileSize(compressionResult.reductionBytes)}`
                    : '0 B savings (file is already compact)'}
                </span>
              </div>
            </div>

            {!compressionResult.isReductionAchieved && (
              <p className="text-xs text-slate-500 leading-tight">
                This document was already structurally compacted and contains no uncompressed objects. You may download the verified PDF or keep the original.
              </p>
            )}
          </div>
        )}

        {/* Tool 5: DOCX Conversion Results & Scanned Detection */}
        {docxResult && (
          <div
            data-testid="docx-result-card"
            className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                DOCX Document Generated
              </h3>
              <span className="text-xs text-slate-600 font-medium">
                {docxResult.extractedCharCount.toLocaleString()} characters extracted across{' '}
                {docxResult.pageCount} page{docxResult.pageCount > 1 ? 's' : ''}
              </span>
            </div>

            {docxResult.isProbableScanned && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Scanned Document Detected</p>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    {docxResult.warningMessage}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tool 3: Rendered Pages Gallery */}
        {renderedPages.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <FileImage className="w-4 h-4 text-brand-600" />
                Rendered Page Gallery ({renderedPages.length} Pages)
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-72 overflow-y-auto p-1 scrollbar-thin">
              {renderedPages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="flex flex-col bg-slate-50 border border-slate-200 rounded-lg p-2 text-center group hover:border-brand-400 hover:shadow-2xs transition-all"
                >
                  <div className="h-32 flex items-center justify-center bg-white rounded border border-slate-100 overflow-hidden mb-1.5">
                    <img
                      src={page.url}
                      alt={page.fileName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold">Page {page.pageNumber}</span>
                    <span>{formatFileSize(page.byteSize)}</span>
                  </div>
                  <a
                    href={page.url}
                    download={page.fileName}
                    className="mt-1.5 py-1 px-2 rounded bg-white hover:bg-brand-600 hover:text-white border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tools 6 & 7: Extracted Text Result Card */}
        {extractedText !== null && (
          <div
            data-testid="extracted-text-card"
            className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-3 animate-fadeIn"
          >
            {/* Header with Title, Stats Badges, and Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-600" />
                  Extracted Text
                </h3>
                {extractedStats && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 text-xs font-semibold">
                      {extractedStats.wordCount.toLocaleString()} Words
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-medium">
                      {extractedStats.charCount.toLocaleString()} Characters
                    </span>
                    {extractedStats.method && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold capitalize">
                        {extractedStats.method === 'ocr'
                          ? 'OCR Processed'
                          : extractedStats.method === 'digital'
                          ? 'Direct Digital'
                          : 'Hybrid OCR + Digital'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Copy, Download, Clear */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  data-testid="copy-text-btn"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-2xs cursor-pointer"
                  data-testid="download-txt-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExtractedText(null);
                    setExtractedStats(null);
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Clear text view"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset View</span>
                </button>
              </div>
            </div>

            {/* Editable Text Area */}
            <div className="space-y-1.5">
              <textarea
                value={extractedText}
                onChange={handleTextareaChange}
                rows={10}
                className="w-full p-3 font-mono text-xs sm:text-sm text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none resize-y leading-relaxed"
                placeholder="Extracted text will appear here..."
                data-testid="extracted-textarea"
                aria-label="Extracted Text"
              />
              <p className="text-xs text-slate-500 flex items-center justify-between">
                <span>Text is fully editable. Edits are retained when clicking Copy or Download.</span>
                <span>UTF-8 plain text</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Controls & Batch Download */}
        <ActionControls
          config={config}
          files={files}
          isProcessing={isProcessing}
          downloadResult={downloadResult}
          onClearAll={handleClearAll}
          onProcessRequested={handleProcessRequested}
          onDownloadRequested={extractedText !== null ? handleDownloadText : undefined}
        />
      </div>

      {/* Informative SEO Section */}
      <ToolExplainer config={config} />
    </div>
  );
};
