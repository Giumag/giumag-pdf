import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  PDFDocumentProxy,
  RenderTask,
} from 'pdfjs-dist';

export interface NormalizedCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropPdfCanvasProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  crop: NormalizedCrop;
  disabled?: boolean;
  onChange: (crop: NormalizedCrop) => void;
}

type CropHandle =
  | 'move'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';

interface PointerStart {
  pointerId: number;
  handle: CropHandle;
  x: number;
  y: number;
  crop: NormalizedCrop;
}

const MIN_CROP_SIZE = 0.04;

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(min, value),
  );
}

export function CropPdfCanvas({
  document,
  pageNumber,
  crop,
  disabled = false,
  onChange,
}: CropPdfCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pointerStartRef = useRef<PointerStart | null>(null);

  const [stageWidth, setStageWidth] = useState(720);
  const [canvasSize, setCanvasSize] = useState({
    width: 1,
    height: 1,
  });
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    function updateWidth() {
      if (!stage) {
        return;
      }

      setStageWidth(
        Math.max(
          1,
          stage.clientWidth,
        ),
      );
    }

    const observer = new ResizeObserver(
      updateWidth,
    );

    observer.observe(stage);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setRendered(false);
    setFailed(false);

    let disposed = false;

    async function renderPage() {
      try {
        renderTaskRef.current?.cancel();

        const page = await document.getPage(
          pageNumber,
        );

        if (disposed) {
          return;
        }

        const baseViewport = page.getViewport({
          scale: 1,
        });

        const targetWidth = Math.max(
          1,
          Math.min(
            760,
            stageWidth - 24,
          ),
        );

        const viewport = page.getViewport({
          scale: targetWidth / baseViewport.width,
        });

        const canvas = canvasRef.current;

        if (!canvas) {
          return;
        }

        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
        );

        const width = Math.max(
          1,
          Math.floor(viewport.width),
        );

        const height = Math.max(
          1,
          Math.floor(viewport.height),
        );

        setCanvasSize({
          width,
          height,
        });

        canvas.width = Math.max(
          1,
          Math.floor(viewport.width * ratio),
        );

        canvas.height = Math.max(
          1,
          Math.floor(viewport.height * ratio),
        );

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const task = page.render({
          canvas,
          viewport,
          transform:
            ratio === 1
              ? undefined
              : [ratio, 0, 0, ratio, 0, 0],
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

    void renderPage();

    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
    };
  }, [
    document,
    pageNumber,
    stageWidth,
  ]);

  function beginPointer(
    handle: CropHandle,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (disabled || !rendered) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    frame.setPointerCapture(
      event.pointerId,
    );

    pointerStartRef.current = {
      pointerId: event.pointerId,
      handle,
      x: (
        event.clientX - rect.left
      ) / rect.width,
      y: (
        event.clientY - rect.top
      ) / rect.height,
      crop: { ...crop },
    };
  }

  function movePointer(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const start = pointerStartRef.current;

    if (
      !start ||
      start.pointerId !== event.pointerId ||
      disabled
    ) {
      return;
    }

    event.preventDefault();

    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    const currentX = (
      event.clientX - rect.left
    ) / rect.width;

    const currentY = (
      event.clientY - rect.top
    ) / rect.height;

    const dx = currentX - start.x;
    const dy = currentY - start.y;

    if (start.handle === 'move') {
      onChange({
        ...start.crop,
        x: clamp(
          start.crop.x + dx,
          0,
          1 - start.crop.width,
        ),
        y: clamp(
          start.crop.y + dy,
          0,
          1 - start.crop.height,
        ),
      });

      return;
    }

    let left = start.crop.x;
    let top = start.crop.y;
    let right =
      start.crop.x + start.crop.width;
    let bottom =
      start.crop.y + start.crop.height;

    if (start.handle.includes('w')) {
      left = clamp(
        start.crop.x + dx,
        0,
        right - MIN_CROP_SIZE,
      );
    }

    if (start.handle.includes('e')) {
      right = clamp(
        start.crop.x +
          start.crop.width +
          dx,
        left + MIN_CROP_SIZE,
        1,
      );
    }

    if (start.handle.includes('n')) {
      top = clamp(
        start.crop.y + dy,
        0,
        bottom - MIN_CROP_SIZE,
      );
    }

    if (start.handle.includes('s')) {
      bottom = clamp(
        start.crop.y +
          start.crop.height +
          dy,
        top + MIN_CROP_SIZE,
        1,
      );
    }

    onChange({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    });
  }

  function endPointer(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const start = pointerStartRef.current;

    if (
      !start ||
      start.pointerId !== event.pointerId
    ) {
      return;
    }

    pointerStartRef.current = null;

    const frame = frameRef.current;

    if (
      frame?.hasPointerCapture(
        event.pointerId,
      )
    ) {
      frame.releasePointerCapture(
        event.pointerId,
      );
    }
  }

  return (
    <div
      ref={stageRef}
      className="crop-canvas-stage"
    >
      <div
        ref={frameRef}
        className={[
          'crop-canvas-frame',
          rendered ? 'is-rendered' : '',
          failed ? 'is-failed' : '',
          disabled ? 'is-disabled' : '',
        ].filter(Boolean).join(' ')}
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
        }}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        {!rendered && !failed && (
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

        {rendered && (
          <div
            className="crop-selection"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
            onPointerDown={(event) => {
              beginPointer(
                'move',
                event,
              );
            }}
          >
            {(
              [
                'nw',
                'n',
                'ne',
                'e',
                'se',
                's',
                'sw',
                'w',
              ] as CropHandle[]
            ).map((handle) => (
              <span
                key={handle}
                className={`crop-handle crop-handle-${handle}`}
                aria-hidden="true"
                onPointerDown={(event) => {
                  beginPointer(
                    handle,
                    event,
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}