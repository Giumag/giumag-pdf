import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface PdfThumbnailProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
}

export function PdfThumbnail({ document, pageNumber, active, onSelect }: PdfThumbnailProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [visible, setVisible] = useState(active || pageNumber <= 4);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setRendered(false);
    setFailed(false);
    setVisible(active || pageNumber <= 4);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [document, pageNumber]);

  useEffect(() => {
    if (active) setVisible(true);
  }, [active]);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element || visible) return;

    const list = element.closest('.thumbnail-list');
    const root = list instanceof HTMLElement ? list : null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root, rootMargin: '260px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || rendered || failed) return;
    let disposed = false;

    async function render() {
      try {
        const page = await document.getPage(pageNumber);
        if (disposed) return;

        const base = page.getViewport({ scale: 1 });
        const targetWidth = 116;
        const viewport = page.getViewport({ scale: targetWidth / base.width });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
        canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
        canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const task = page.render({
          canvas,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        renderTaskRef.current = task;

        await task.promise;
        if (!disposed) setRendered(true);
      } catch (error) {
        if (error instanceof Error && error.name === 'RenderingCancelledException') return;
        if (!disposed) setFailed(true);
      }
    }

    void render();

    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
    };
  }, [document, failed, pageNumber, rendered, visible]);

  return (
    <button
      ref={buttonRef}
      className={`thumbnail${active ? ' thumbnail-active' : ''}`}
      type="button"
      onClick={onSelect}
      aria-label={`Open page ${pageNumber}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className={`thumbnail-canvas-wrap${rendered ? ' is-rendered' : ''}${failed ? ' is-failed' : ''}`}>
        {!rendered && !failed && <span className="thumbnail-placeholder" aria-hidden="true" />}
        {failed && <span className="thumbnail-fallback" aria-hidden="true">{pageNumber}</span>}
        <canvas ref={canvasRef} />
      </span>
      <span className="thumbnail-number">{pageNumber}</span>
    </button>
  );
}
