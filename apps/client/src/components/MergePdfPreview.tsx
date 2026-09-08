import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface MergePdfPreviewProps {
  document: PDFDocumentProxy;
  fileName: string;
}

export function MergePdfPreview({
  document,
  fileName,
}: MergePdfPreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setRendered(false);
    setFailed(false);
    setVisible(false);

    const canvas = canvasRef.current;

    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [document]);

  useEffect(() => {
    const element = rootRef.current;

    if (!element || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '360px 0px',
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || rendered || failed) {
      return;
    }

    let disposed = false;

    async function renderPreview() {
      try {
        renderTaskRef.current?.cancel();

        const page = await document.getPage(1);

        if (disposed) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });

        const targetWidth = 146;

        const viewport = page.getViewport({
          scale: targetWidth / baseViewport.width,
        });

        const canvas = canvasRef.current;

        if (!canvas) {
          return;
        }

        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          1.75,
        );

        canvas.width = Math.max(
          1,
          Math.floor(viewport.width * pixelRatio),
        );

        canvas.height = Math.max(
          1,
          Math.floor(viewport.height * pixelRatio),
        );

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const task = page.render({
          canvas,
          viewport,
          transform:
            pixelRatio === 1
              ? undefined
              : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });

        renderTaskRef.current = task;

        await task.promise;

        if (!disposed) {
          setRendered(true);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'RenderingCancelledException'
        ) {
          return;
        }

        if (!disposed) {
          setFailed(true);
        }
      }
    }

    void renderPreview();

    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
    };
  }, [
    document,
    failed,
    rendered,
    visible,
  ]);

  return (
    <div
      ref={rootRef}
      className={[
        'merge-file-preview',
        rendered ? 'is-rendered' : '',
        failed ? 'is-failed' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Anteprima di ${fileName}`}
    >
      {!rendered && !failed && (
        <div
          className="merge-preview-placeholder"
          aria-hidden="true"
        />
      )}

      {failed && (
        <div
          className="merge-preview-fallback"
          aria-hidden="true"
        >
          PDF
        </div>
      )}

      <canvas
        ref={canvasRef}
        aria-hidden="true"
      />

      <span className="merge-preview-label">
        Pagina 1
      </span>
    </div>
  );
}