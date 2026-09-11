import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  PDFDocumentProxy,
  RenderTask,
} from 'pdfjs-dist';

interface ComparePdfPagePaneProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  label: string;
  missing?: boolean;
}

export function ComparePdfPagePane({
  document,
  pageNumber,
  label,
  missing = false,
}: ComparePdfPagePaneProps) {
  const hostRef =
    useRef<HTMLDivElement>(
      null,
    );

  const canvasRef =
    useRef<HTMLCanvasElement>(
      null,
    );

  const renderTaskRef =
    useRef<RenderTask | null>(
      null,
    );

  const [
    width,
    setWidth,
  ] =
    useState(500);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  useEffect(() => {
    const host =
      hostRef.current;

    if (!host) {
      return;
    }

    const update = () => {
      setWidth(
        Math.max(
          180,
          host.clientWidth,
        ),
      );
    };

    update();

    const observer =
      new ResizeObserver(update);

    observer.observe(host);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (missing) {
      setLoading(false);
      setFailed(false);
      return;
    }

    let disposed = false;

    setLoading(true);
    setFailed(false);

    try {
      renderTaskRef.current?.cancel();
    } catch {
      // Nessuna azione.
    }

    async function renderPage() {
      try {
        const page =
          await document.getPage(
            pageNumber,
          );

        if (disposed) {
          return;
        }

        const baseViewport =
          page.getViewport({
            scale: 1,
          });

        const available =
          Math.max(
            160,
            width - 28,
          );

        const viewport =
          page.getViewport({
            scale:
              available /
              baseViewport.width,
          });

        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const ratio =
          Math.min(
            window.devicePixelRatio ||
              1,
            1.75,
          );

        canvas.width =
          Math.max(
            1,
            Math.floor(
              viewport.width *
                ratio,
            ),
          );

        canvas.height =
          Math.max(
            1,
            Math.floor(
              viewport.height *
                ratio,
            ),
          );

        canvas.style.width =
          `${Math.floor(
            viewport.width,
          )}px`;

        canvas.style.height =
          `${Math.floor(
            viewport.height,
          )}px`;

        const task =
          page.render({
            canvas,
            viewport,
            transform:
              ratio === 1
                ? undefined
                : [
                    ratio,
                    0,
                    0,
                    ratio,
                    0,
                    0,
                  ],
            background:
              '#ffffff',
          });

        renderTaskRef.current =
          task;

        await task.promise;

        if (!disposed) {
          setLoading(false);
        }
      } catch (error) {
        const name =
          (
            error as {
              name?: string;
            }
          ).name;

        if (
          !disposed &&
          name !==
            'RenderingCancelledException'
        ) {
          console.error(
            '[Giumag Compare] preview fallita:',
            error,
          );

          setFailed(true);
          setLoading(false);
        }
      }
    }

    void renderPage();

    return () => {
      disposed = true;

      try {
        renderTaskRef.current?.cancel();
      } catch {
        // Nessuna azione.
      }

      renderTaskRef.current =
        null;
    };
  }, [
    document,
    pageNumber,
    width,
    missing,
  ]);

  return (
    <section
      ref={hostRef}
      className="compare-page-pane"
    >
      <div className="compare-pane-label">
        {label}
      </div>

      <div className="compare-page-stage">
        {missing ? (
          <div className="compare-missing-page">
            <strong>
              Pagina assente
            </strong>

            <span>
              Questo documento non contiene
              la pagina {pageNumber}.
            </span>
          </div>
        ) : (
          <>
            {loading && (
              <div className="compare-page-loading">
                Rendering pagina…
              </div>
            )}

            {failed && (
              <div
                className="compare-page-error"
                role="alert"
              >
                Impossibile mostrare questa pagina.
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="compare-page-canvas"
              aria-label={`${label}, pagina ${pageNumber}`}
            />
          </>
        )}
      </div>
    </section>
  );
}