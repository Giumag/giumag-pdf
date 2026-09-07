import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoadedPdf } from '../lib/pdf';
import { formatBytes } from '../lib/pdf';
import { PdfCanvas } from './PdfCanvas';
import { PdfThumbnail } from './PdfThumbnail';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  MinusIcon,
  PlusIcon,
  ReplaceIcon,
  ShieldIcon,
} from './Icons';

interface PdfWorkspaceProps {
  pdf: LoadedPdf;
  onClose: () => void;
  onReplace: (file: File) => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

export function PdfWorkspace({ pdf, onClose, onReplace }: PdfWorkspaceProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageNumbers = useMemo(
    () => Array.from({ length: pdf.document.numPages }, (_, index) => index + 1),
    [pdf.document.numPages],
  );

  useEffect(() => {
    setPageNumber(1);
    setZoom(1);
  }, [pdf]);

  function setSafePage(next: number) {
    setPageNumber(Math.max(1, Math.min(pdf.document.numPages, next)));
  }

  function changeZoom(delta: number) {
    setZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((current + delta).toFixed(2)))));
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar glass-surface">
        <button className="brand-button" type="button" onClick={onClose} aria-label="Back to Giumag PDF home">
          <span className="brand-mark">G</span>
          <span>Giumag PDF</span>
        </button>

        <div className="document-title" title={pdf.name}>
          <strong>{pdf.name}</strong>
          <span><ShieldIcon /> Local document · {pdf.document.numPages} pages · {formatBytes(pdf.size)}</span>
        </div>

        <div className="topbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onReplace(file);
              event.currentTarget.value = '';
            }}
          />
          <button className="secondary-button compact-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <ReplaceIcon />
            <span>Replace</span>
          </button>
          <button className="primary-button compact-button" type="button" disabled title="Export will be enabled with editing tools">
            <DownloadIcon />
            <span>Export</span>
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="thumbnail-sidebar" aria-label="Document pages">
          <div className="sidebar-heading">
            <span>Pages</span>
            <span className="count-badge">{pdf.document.numPages}</span>
          </div>
          <div className="thumbnail-list">
            {pageNumbers.map((number) => (
              <PdfThumbnail
                key={number}
                document={pdf.document}
                pageNumber={number}
                active={number === pageNumber}
                onSelect={() => setPageNumber(number)}
              />
            ))}
          </div>
        </aside>

        <section className="viewer" aria-label={`Viewing page ${pageNumber} of ${pdf.document.numPages}`}>
          <div className="viewer-toolbar glass-surface" role="toolbar" aria-label="PDF viewer controls">
            <div className="toolbar-group">
              <button type="button" className="toolbar-button" onClick={() => setSafePage(pageNumber - 1)} disabled={pageNumber === 1} aria-label="Previous page">
                <ChevronLeftIcon />
              </button>
              <div className="page-counter">
                <input
                  aria-label="Current page"
                  inputMode="numeric"
                  value={pageNumber}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.currentTarget.value, 10);
                    if (Number.isFinite(parsed)) setSafePage(parsed);
                  }}
                />
                <span>of {pdf.document.numPages}</span>
              </div>
              <button type="button" className="toolbar-button" onClick={() => setSafePage(pageNumber + 1)} disabled={pageNumber === pdf.document.numPages} aria-label="Next page">
                <ChevronRightIcon />
              </button>
            </div>

            <span className="toolbar-divider" aria-hidden="true" />

            <div className="toolbar-group zoom-controls">
              <button type="button" className="toolbar-button" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
                <MinusIcon />
              </button>
              <button type="button" className="zoom-value" onClick={() => setZoom(1)} title="Reset zoom to 100%">{Math.round(zoom * 100)}%</button>
              <button type="button" className="toolbar-button" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
                <PlusIcon />
              </button>
            </div>
          </div>

          <div className="viewer-scroll-area">
            <PdfCanvas document={pdf.document} pageNumber={pageNumber} zoom={zoom} />
          </div>
        </section>
      </div>
    </main>
  );
}
