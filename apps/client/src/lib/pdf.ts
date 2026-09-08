import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PDFJS_ASSET_BASE = `${import.meta.env.BASE_URL}pdfjs/`;

export interface LoadedPdf {
  document: PDFDocumentProxy;
  bytes: Uint8Array;
  name: string;
  size: number;
}

export async function loadPdfFile(file: File): Promise<LoadedPdf> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Seleziona un documento PDF.');
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const signatureWindow = new TextDecoder('ascii').decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  if (!signatureWindow.includes('%PDF-')) {
    throw new Error('Il file selezionato non è un documento PDF valido.');
  }

  const document = await getDocument({
    data: bytes.slice(),
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    cMapPacked: true,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
    useSystemFonts: true,
  }).promise;

  return {
    document,
    bytes,
    name: file.name,
    size: file.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
