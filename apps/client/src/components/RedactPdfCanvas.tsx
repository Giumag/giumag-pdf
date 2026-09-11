import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type {
  PDFDocumentProxy,
  RenderTask,
} from 'pdfjs-dist';

import type {
  RedactionArea,
} from '../lib/redact-pdf';

interface RedactPdfCanvasProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  redactions: RedactionArea[];
  disabled?: boolean;
  onAdd: (
    area:
      Omit<
        RedactionArea,
        'id'
      >,
  ) => void;
  onRemove: (
    id: string,
  ) => void;
}

type DraftArea =
  Omit<
    RedactionArea,
    'id'
  >;

interface PointerStart {
  pointerId: number;
  x: number;
  y: number;
}

const MIN_AREA_SIZE =
  0.006;

function clamp(
  value: number,
) {
  return Math.min(
    1,
    Math.max(
      0,
      value,
    ),
  );
}

export function RedactPdfCanvas({
  document,
  pageNumber,
  redactions,
  disabled = false,
  onAdd,
  onRemove,
}: RedactPdfCanvasProps) {
  const stageRef =
    useRef<HTMLDivElement>(
      null,
    );

  const frameRef =
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

  const pointerStartRef =
    useRef<PointerStart | null>(
      null,
    );

  const draftRef =
    useRef<DraftArea | null>(
      null,
    );

  const [
    stageWidth,
    setStageWidth,
  ] = useState(720);

  const [
    canvasSize,
    setCanvasSize,
  ] = useState({
    width: 1,
    height: 1,
  });

  const [
    rendered,
    setRendered,
  ] = useState(false);

  const [
    failed,
    setFailed,
  ] = useState(false);

  const [
    draft,
    setDraft,
  ] =
    useState<DraftArea | null>(
      null,
    );

  useEffect(() => {
    const stage =
      stageRef.current;

    if (!stage) {
      return;
    }

    const update = () => {
      setStageWidth(
        Math.max(
          220,
          stage.clientWidth,
        ),
      );
    };

    update();

    const observer =
      new ResizeObserver(
        update,
      );

    observer.observe(
      stage,
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let disposed =
      false;

    setRendered(false);
    setFailed(false);

    try {
      renderTaskRef.current
        ?.cancel();
    } catch {
      // Nessuna azione.
    }

    renderTaskRef.current =
      null;

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

        const availableWidth =
          Math.max(
            180,
            Math.min(
              stageWidth - 24,
              860,
            ),
          );

        const viewport =
          page.getViewport({
            scale:
              availableWidth /
              baseViewport.width,
          });

        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const ratio =
          Math.min(
            window
              .devicePixelRatio ||
              1,
            2,
          );

        const width =
          Math.max(
            1,
            Math.floor(
              viewport.width,
            ),
          );

        const height =
          Math.max(
            1,
            Math.floor(
              viewport.height,
            ),
          );

        setCanvasSize({
          width,
          height,
        });

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
          `${width}px`;

        canvas.style.height =
          `${height}px`;

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
          });

        renderTaskRef.current =
          task;

        await task.promise;

        if (!disposed) {
          setRendered(true);
        }
      } catch (error) {
        const name =
          (
            error as {
              name?: string;
            }
          )?.name;

        if (
          !disposed &&
          name !==
            'RenderingCancelledException'
        ) {
          console.error(
            '[Giumag Redact] Preview pagina fallita:',
            error,
          );

          setFailed(true);
        }
      }
    }

    void renderPage();

    return () => {
      disposed = true;

      try {
        renderTaskRef.current
          ?.cancel();
      } catch {
        // Nessuna azione.
      }

      renderTaskRef.current =
        null;

      pointerStartRef.current =
        null;

      draftRef.current =
        null;

      setDraft(null);
    };
  }, [
    document,
    pageNumber,
    stageWidth,
  ]);

  function setNextDraft(
    value:
      DraftArea | null,
  ) {
    draftRef.current =
      value;

    setDraft(
      value,
    );
  }

  function pointFromEvent(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const frame =
      frameRef.current;

    if (!frame) {
      return null;
    }

    const rect =
      frame.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null;
    }

    return {
      x:
        clamp(
          (
            event.clientX -
            rect.left
          ) /
            rect.width,
        ),
      y:
        clamp(
          (
            event.clientY -
            rect.top
          ) /
            rect.height,
        ),
    };
  }

  function beginPointer(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      disabled ||
      !rendered
    ) {
      return;
    }

    const target =
      event.target as HTMLElement;

    if (
      target.closest(
        '.redact-area',
      )
    ) {
      return;
    }

    const point =
      pointFromEvent(
        event,
      );

    if (!point) {
      return;
    }

    event.preventDefault();

    const frame =
      frameRef.current;

    frame?.setPointerCapture(
      event.pointerId,
    );

    pointerStartRef.current = {
      pointerId:
        event.pointerId,
      x:
        point.x,
      y:
        point.y,
    };

    setNextDraft({
      x:
        point.x,
      y:
        point.y,
      width: 0,
      height: 0,
    });
  }

  function movePointer(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const start =
      pointerStartRef.current;

    if (
      !start ||
      start.pointerId !==
        event.pointerId ||
      disabled
    ) {
      return;
    }

    const point =
      pointFromEvent(
        event,
      );

    if (!point) {
      return;
    }

    event.preventDefault();

    const left =
      Math.min(
        start.x,
        point.x,
      );

    const top =
      Math.min(
        start.y,
        point.y,
      );

    const right =
      Math.max(
        start.x,
        point.x,
      );

    const bottom =
      Math.max(
        start.y,
        point.y,
      );

    setNextDraft({
      x:
        left,
      y:
        top,
      width:
        right - left,
      height:
        bottom - top,
    });
  }

  function endPointer(
    event:
      ReactPointerEvent<HTMLDivElement>,
    commit: boolean,
  ) {
    const start =
      pointerStartRef.current;

    if (
      !start ||
      start.pointerId !==
        event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const frame =
      frameRef.current;

    if (
      frame?.hasPointerCapture(
        event.pointerId,
      )
    ) {
      frame.releasePointerCapture(
        event.pointerId,
      );
    }

    const next =
      draftRef.current;

    pointerStartRef.current =
      null;

    setNextDraft(
      null,
    );

    if (
      !commit ||
      !next ||
      next.width <
        MIN_AREA_SIZE ||
      next.height <
        MIN_AREA_SIZE
    ) {
      return;
    }

    onAdd(
      next,
    );
  }

  return (
    <div
      ref={stageRef}
      className="crop-canvas-stage redact-canvas-stage"
    >
      <div
        ref={frameRef}
        className={[
          'crop-canvas-frame',
          'redact-canvas-frame',
          disabled
            ? 'is-disabled'
            : '',
        ].filter(Boolean).join(' ')}
        style={{
          width:
            `${canvasSize.width}px`,
          height:
            `${canvasSize.height}px`,
        }}
        onPointerDown={
          beginPointer
        }
        onPointerMove={
          movePointer
        }
        onPointerUp={(
          event,
        ) =>
          endPointer(
            event,
            true,
          )
        }
        onPointerCancel={(
          event,
        ) =>
          endPointer(
            event,
            false,
          )
        }
      >
        {!rendered &&
          !failed && (
            <div
              className="crop-canvas-loading"
              aria-hidden="true"
            >
              Rendering pagina...
            </div>
          )}

        {failed && (
          <div
            className="crop-canvas-error"
            role="alert"
          >
            Impossibile mostrare questa pagina.
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="crop-pdf-canvas"
          aria-hidden="true"
        />

        {rendered &&
          redactions.map(
            (
              area,
              index,
            ) => (
              <button
                key={area.id}
                type="button"
                className="redact-area"
                aria-label={`Rimuovi area oscurata ${index + 1}`}
                disabled={
                  disabled
                }
                style={{
                  left:
                    `${area.x * 100}%`,
                  top:
                    `${area.y * 100}%`,
                  width:
                    `${area.width * 100}%`,
                  height:
                    `${area.height * 100}%`,
                }}
                onPointerDown={(
                  event,
                ) => {
                  event
                    .stopPropagation();
                }}
                onClick={(
                  event,
                ) => {
                  event
                    .stopPropagation();

                  onRemove(
                    area.id,
                  );
                }}
              >
                <span>
                  {index + 1}
                </span>
              </button>
            ),
          )}

        {rendered &&
          draft && (
            <div
              className="redact-area redact-area-draft"
              aria-hidden="true"
              style={{
                left:
                  `${draft.x * 100}%`,
                top:
                  `${draft.y * 100}%`,
                width:
                  `${draft.width * 100}%`,
                height:
                  `${draft.height * 100}%`,
              }}
            />
          )}
      </div>
    </div>
  );
}