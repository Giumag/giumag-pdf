import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type {
  VisualSignaturePlacement,
} from '../lib/visual-signature';

pdfjs.GlobalWorkerOptions.workerSrc =
  pdfWorkerUrl;

interface VisualSignatureCanvasProps {
  pdfBytes: Uint8Array;
  pageIndex: number;
  signaturePreviewUrl: string | null;
  signatureAspectRatio: number;
  placement:
    | VisualSignaturePlacement
    | null;
  onPlacementChange: (
    placement:
      | VisualSignaturePlacement
      | null,
  ) => void;
  onPageCount: (
    pageCount: number,
  ) => void;
}

interface DragState {
  mode: 'move' | 'resize';
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPlacement: VisualSignaturePlacement;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

export function VisualSignatureCanvas({
  pdfBytes,
  pageIndex,
  signaturePreviewUrl,
  signatureAspectRatio,
  placement,
  onPlacementChange,
  onPageCount,
}: VisualSignatureCanvasProps) {
  const hostRef =
    useRef<HTMLDivElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const dragRef =
    useRef<DragState | null>(null);

  const [hostWidth, setHostWidth] =
    useState(760);

  const [pageSize, setPageSize] =
    useState({
      width: 1,
      height: 1,
    });

  const [rendering, setRendering] =
    useState(false);

  const [renderError, setRenderError] =
    useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const update = () => {
      setHostWidth(
        Math.max(
          280,
          Math.min(
            host.clientWidth,
            920,
          ),
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
    let cancelled = false;

    const loadingTask =
      pdfjs.getDocument({
        data: pdfBytes.slice(),
      });

    const render = async () => {
      setRendering(true);
      setRenderError(null);

      try {
        const document =
          await loadingTask.promise;

        if (cancelled) {
          return;
        }

        onPageCount(
          document.numPages,
        );

        const safePageIndex =
          Math.min(
            Math.max(
              pageIndex,
              0,
            ),
            document.numPages - 1,
          );

        const page =
          await document.getPage(
            safePageIndex + 1,
          );

        const baseViewport =
          page.getViewport({
            scale: 1,
          });

        const displayScale =
          Math.min(
            1.6,
            hostWidth /
              baseViewport.width,
          );

        const displayViewport =
          page.getViewport({
            scale: displayScale,
          });

        const pixelRatio =
          Math.min(
            window.devicePixelRatio ||
              1,
            2,
          );

        const renderViewport =
          page.getViewport({
            scale:
              displayScale *
              pixelRatio,
          });

        const canvas =
          canvasRef.current;

        if (!canvas || cancelled) {
          return;
        }

        const context =
          canvas.getContext('2d');

        if (!context) {
          throw new Error(
            'Canvas 2D non disponibile.',
          );
        }

        canvas.width =
          Math.ceil(
            renderViewport.width,
          );

        canvas.height =
          Math.ceil(
            renderViewport.height,
          );

        canvas.style.width =
          `${displayViewport.width}px`;

        canvas.style.height =
          `${displayViewport.height}px`;

        setPageSize({
          width:
            displayViewport.width,
          height:
            displayViewport.height,
        });

        const renderTask =
          page.render({
            canvas,
            canvasContext: context,
            viewport: renderViewport,
          });

        await renderTask.promise;
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRenderError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;

      void loadingTask.destroy();
    };
  }, [
    hostWidth,
    onPageCount,
    pageIndex,
    pdfBytes,
  ]);

  const createPlacement = () => {
    if (
      !signaturePreviewUrl ||
      pageSize.width <= 0 ||
      pageSize.height <= 0
    ) {
      return;
    }

    const widthPx =
      Math.min(
        pageSize.width * 0.32,
        260,
      );

    const safeAspect =
      Number.isFinite(
        signatureAspectRatio,
      ) &&
      signatureAspectRatio > 0
        ? signatureAspectRatio
        : 3;

    const rawHeightPx =
      widthPx / safeAspect;

    const heightPx =
      Math.min(
        rawHeightPx,
        pageSize.height * 0.2,
      );

    const width =
      widthPx /
      pageSize.width;

    const height =
      heightPx /
      pageSize.height;

    onPlacementChange({
      pageIndex,
      width,
      height,
      x: Math.max(
        0,
        0.5 - width / 2,
      ),
      y: Math.max(
        0,
        0.72 - height / 2,
      ),
    });
  };

  const beginDrag = (
    event: ReactPointerEvent<
      HTMLDivElement
    >,
    mode: 'move' | 'resize',
  ) => {
    if (!placement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPlacement: {
        ...placement,
      },
    };
  };

  const handlePointerMove = (
    event: ReactPointerEvent<
      HTMLDivElement
    >,
  ) => {
    const drag = dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId ||
      pageSize.width <= 0 ||
      pageSize.height <= 0
    ) {
      return;
    }

    const dx =
      (event.clientX -
        drag.startClientX) /
      pageSize.width;

    const dy =
      (event.clientY -
        drag.startClientY) /
      pageSize.height;

    const start =
      drag.startPlacement;

    if (drag.mode === 'move') {
      onPlacementChange({
        ...start,
        x: clamp(
          start.x + dx,
          0,
          1 - start.width,
        ),
        y: clamp(
          start.y + dy,
          0,
          1 - start.height,
        ),
      });

      return;
    }

    const startWidthPx =
      start.width *
      pageSize.width;

    const nextWidthPx =
      Math.max(
        72,
        startWidthPx +
          event.clientX -
          drag.startClientX,
      );

    const safeAspect =
      Number.isFinite(
        signatureAspectRatio,
      ) &&
      signatureAspectRatio > 0
        ? signatureAspectRatio
        : 3;

    let nextWidth =
      nextWidthPx /
      pageSize.width;

    let nextHeight =
      (nextWidthPx /
        safeAspect) /
      pageSize.height;

    const maxWidth =
      1 - start.x;

    const maxHeight =
      1 - start.y;

    if (nextWidth > maxWidth) {
      nextWidth = maxWidth;

      nextHeight =
        (
          nextWidth *
          pageSize.width /
          safeAspect
        ) /
        pageSize.height;
    }

    if (nextHeight > maxHeight) {
      nextHeight = maxHeight;

      nextWidth =
        (
          nextHeight *
          pageSize.height *
          safeAspect
        ) /
        pageSize.width;
    }

    onPlacementChange({
      ...start,
      width: Math.max(
        0.04,
        nextWidth,
      ),
      height: Math.max(
        0.02,
        nextHeight,
      ),
    });
  };

  const finishDrag = (
    event: ReactPointerEvent<
      HTMLDivElement
    >,
  ) => {
    if (
      dragRef.current
        ?.pointerId ===
      event.pointerId
    ) {
      dragRef.current = null;
    }
  };

  return (
    <div
      ref={hostRef}
      className="visual-signature-canvas-host"
    >
      <div
        className="visual-signature-page"
        style={{
          width: pageSize.width,
          height: pageSize.height,
        }}
      >
        <canvas
          ref={canvasRef}
          className="visual-signature-pdf-canvas"
        />

        {rendering ? (
          <div className="visual-signature-render-state">
            Rendering pagina…
          </div>
        ) : null}

        {renderError ? (
          <div className="visual-signature-render-error">
            {renderError}
          </div>
        ) : null}

        {signaturePreviewUrl &&
        placement ? (
          <div
            className="visual-signature-stamp"
            style={{
              left:
                `${placement.x * 100}%`,
              top:
                `${placement.y * 100}%`,
              width:
                `${placement.width * 100}%`,
              height:
                `${placement.height * 100}%`,
            }}
            onPointerDown={(event) =>
              beginDrag(
                event,
                'move',
              )
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <img
              src={
                signaturePreviewUrl
              }
              alt="Firma"
              draggable={false}
            />

            <div
              className="visual-signature-resize-handle"
              aria-label="Ridimensiona firma"
              onPointerDown={(event) =>
                beginDrag(
                  event,
                  'resize',
                )
              }
              onPointerMove={
                handlePointerMove
              }
              onPointerUp={finishDrag}
              onPointerCancel={
                finishDrag
              }
            />
          </div>
        ) : null}

        {signaturePreviewUrl &&
        !placement &&
        !rendering ? (
          <button
            type="button"
            className="visual-signature-place-button"
            onClick={
              createPlacement
            }
          >
            Posiziona firma su questa pagina
          </button>
        ) : null}
      </div>
    </div>
  );
}