import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { PageRotation } from '@giumag/pdf-engine';

interface PdfCanvasProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  rotation?: PageRotation;
}

export function PdfCanvas({ document, pageNumber, zoom, rotation = 0 }: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function render() {
      setRendering(true);
      renderTaskRef.current?.cancel();

      const page = await document.getPage(pageNumber);
      if (disposed) return;

      const viewport = page.getViewport({ scale: zoom, rotation: (page.rotate + rotation) % 360 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const task = page.render({
        canvas,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      renderTaskRef.current = task;

      try {
        await task.promise;
        if (!disposed) setRendering(false);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'RenderingCancelledException')) throw error;
      }
    }

    void render();

    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
    };
  }, [document, pageNumber, rotation, zoom]);

  return (
    <div className="page-canvas-frame" aria-busy={rendering}>
      {rendering && <div className="canvas-loading">Rendering page...</div>}
      <canvas ref={canvasRef} className="pdf-canvas" />
    </div>
  );
}
