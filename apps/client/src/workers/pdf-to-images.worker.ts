import {
  GlobalWorkerOptions,
  getDocument,
} from 'pdfjs-dist';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import {
  normalizePdfToImagesOptions,
  pdfToImagesMimeType,
  resolvePdfToImagesPageIndexes,
  type PdfToImagesFormat,
  type PdfToImagesOptions,
} from '../lib/pdf-to-images';

GlobalWorkerOptions.workerSrc =
  pdfWorkerUrl;

const PDFJS_ASSET_BASE =
  `${import.meta.env.BASE_URL}pdfjs/`;

/*
 * 40 milioni di pixel equivalgono
 * indicativamente a 160 MB di buffer
 * RGBA per una singola pagina.
 *
 * Il limite evita allocazioni estreme
 * soprattutto su mobile, senza limitare
 * A4/Letter alle scale normali della UI.
 */
const MAX_OUTPUT_PIXELS =
  40_000_000;

const MAX_OUTPUT_DIMENSION =
  32_767;

interface WorkerRequest {
  id: number;
  bytes: ArrayBuffer;
  options: PdfToImagesOptions;
}

interface WorkerRenderedImage {
  pageIndex: number;
  width: number;
  height: number;
  format: PdfToImagesFormat;
  mimeType:
    | 'image/png'
    | 'image/jpeg';
  bytes: ArrayBuffer;
}

interface WorkerPageResponse {
  id: number;
  type: 'page';
  image: WorkerRenderedImage;
}

interface WorkerProgressResponse {
  id: number;
  type: 'progress';
  completed: number;
  total: number;
  pageIndex: number;
}

interface WorkerSuccess {
  id: number;
  type: 'success';
}

interface WorkerFailure {
  id: number;
  type: 'failure';
  error: string;
}

type WorkerResponse =
  | WorkerPageResponse
  | WorkerProgressResponse
  | WorkerSuccess
  | WorkerFailure;

interface PdfImagesWorkerScope {
  addEventListener(
    type: 'message',
    listener: (
      event:
        MessageEvent<WorkerRequest>,
    ) => void,
  ): void;

  postMessage(
    message:
      WorkerResponse,
    transfer?:
      Transferable[],
  ): void;
}

interface WorkerCanvasContext {
  canvas: OffscreenCanvas;
  context:
    OffscreenCanvasRenderingContext2D;
}

/*
 * PDF.js permette di fornire una CanvasFactory.
 * Nel nostro worker usiamo OffscreenCanvas,
 * evitando qualunque dipendenza da document/DOM.
 */
class OffscreenCanvasFactory {
  constructor(
    _options?: unknown,
  ) {}

  create(
    width: number,
    height: number,
  ): WorkerCanvasContext {
    if (
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(
        'Dimensioni canvas non valide.',
      );
    }

    const canvas =
      new OffscreenCanvas(
        width,
        height,
      );

    const context =
      canvas.getContext(
        '2d',
        {
          alpha: true,
        },
      );

    if (!context) {
      throw new Error(
        'Impossibile inizializzare il canvas di rendering.',
      );
    }

    return {
      canvas,
      context,
    };
  }

  reset(
    target:
      WorkerCanvasContext,
    width: number,
    height: number,
  ) {
    if (
      width <= 0 ||
      height <= 0
    ) {
      throw new Error(
        'Dimensioni canvas non valide.',
      );
    }

    target.canvas.width =
      width;

    target.canvas.height =
      height;
  }

  destroy(
    target:
      WorkerCanvasContext,
  ) {
    target.canvas.width = 0;
    target.canvas.height = 0;
  }
}

/*
 * In un Dedicated Worker non esiste un DOM
 * nel quale PDF.js possa creare filtri SVG.
 *
 * PDF.js usa lo stesso comportamento "none"
 * nella factory Node: e una fallback prevista
 * dal renderer per ambienti senza DOM.
 */
class WorkerFilterFactory {
  constructor(
    _options?: unknown,
  ) {}

  addFilter() {
    return 'none';
  }

  addHCMFilter() {
    return 'none';
  }

  addAlphaFilter() {
    return 'none';
  }

  addLuminosityFilter() {
    return 'none';
  }

  addKnockoutFilter() {
    return 'none';
  }

  addHighlightHCMFilter() {
    return 'none';
  }

  addSelectionHCMFilter() {
    return 'none';
  }

  addSelectionFilter() {
    return 'none';
  }

  createSelectionStyle() {
    return null;
  }

  destroy() {}
}

const workerScope =
  self as unknown as
    PdfImagesWorkerScope;

function errorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Impossibile convertire il PDF in immagini.';
}

function ensureWorkerCanvasSupport() {
  if (
    typeof OffscreenCanvas ===
    'undefined'
  ) {
    throw new Error(
      'Questo browser non supporta il rendering PDF avanzato richiesto.',
    );
  }

  const probe =
    new OffscreenCanvas(
      1,
      1,
    );

  if (
    typeof probe
      .convertToBlob !==
    'function'
  ) {
    throw new Error(
      'Questo browser non supporta l esportazione immagini dal worker.',
    );
  }
}

function validateOutputSize(
  width: number,
  height: number,
  pageIndex: number,
) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      `Dimensioni non valide per la pagina ${pageIndex + 1}.`,
    );
  }

  if (
    width >
      MAX_OUTPUT_DIMENSION ||
    height >
      MAX_OUTPUT_DIMENSION ||
    width * height >
      MAX_OUTPUT_PIXELS
  ) {
    throw new Error(
      `La pagina ${pageIndex + 1} e troppo grande alla risoluzione selezionata. Riduci la scala.`,
    );
  }
}

async function renderPdf(
  request:
    WorkerRequest,
) {
  ensureWorkerCanvasSupport();

  const options =
    normalizePdfToImagesOptions(
      request.options,
    );

  const loadingTask =
    getDocument({
      data:
        new Uint8Array(
          request.bytes,
        ),

      cMapUrl:
        `${PDFJS_ASSET_BASE}cmaps/`,

      cMapPacked: true,

      iccUrl:
        `${PDFJS_ASSET_BASE}iccs/`,

      standardFontDataUrl:
        `${PDFJS_ASSET_BASE}standard_fonts/`,

      wasmUrl:
        `${PDFJS_ASSET_BASE}wasm/`,

      /*
       * Il worker non possiede un document DOM.
       * PDF.js usera il renderer interno dei font.
       */
      disableFontFace: true,
      useSystemFonts: false,

      /*
       * Gli asset restano locali e vengono
       * letti dalla build/PWA.
       */
      useWorkerFetch: true,

      isOffscreenCanvasSupported:
        true,

      CanvasFactory:
        OffscreenCanvasFactory,

      FilterFactory:
        WorkerFilterFactory,
    });

  try {
    const document =
      await loadingTask.promise;

    const pageIndexes =
      resolvePdfToImagesPageIndexes(
        document.numPages,
        options.pageIndexes,
      );

    const total =
      pageIndexes.length;

    for (
      let position = 0;
      position < total;
      position += 1
    ) {
      const pageIndex =
        pageIndexes[position];

      const page =
        await document.getPage(
          pageIndex + 1,
        );

      try {
        const viewport =
          page.getViewport({
            scale:
              options.scale,
          });

        const width =
          Math.max(
            1,
            Math.ceil(
              viewport.width,
            ),
          );

        const height =
          Math.max(
            1,
            Math.ceil(
              viewport.height,
            ),
          );

        validateOutputSize(
          width,
          height,
          pageIndex,
        );

        const canvas =
          new OffscreenCanvas(
            width,
            height,
          );

        const context =
          canvas.getContext(
            '2d',
            {
              alpha: false,
            },
          );

        if (!context) {
          throw new Error(
            `Impossibile preparare la pagina ${pageIndex + 1}.`,
          );
        }

        /*
         * Un foglio PDF e concettualmente
         * bianco. Questo evita sfondi neri
         * o trasparenti, in particolare
         * quando si esporta JPEG.
         */
        context.save();
        context.fillStyle =
          '#ffffff';

        context.fillRect(
          0,
          0,
          width,
          height,
        );

        context.restore();

        await page.render({
          canvas: null,
          canvasContext:
            context as unknown as
              CanvasRenderingContext2D,
          viewport,
          background:
            '#ffffff',
        }).promise;

        const mimeType =
          pdfToImagesMimeType(
            options.format,
          );

        const blob =
          options.format ===
          'jpeg'
            ? await canvas.convertToBlob({
                type:
                  mimeType,
                quality:
                  options.jpegQuality,
              })
            : await canvas.convertToBlob({
                type:
                  mimeType,
              });

        const output =
          await blob.arrayBuffer();

        const pageResponse:
          WorkerPageResponse = {
            id: request.id,
            type: 'page',
            image: {
              pageIndex,
              width,
              height,
              format:
                options.format,
              mimeType,
              bytes:
                output,
            },
          };

        /*
         * Il buffer viene trasferito subito
         * al main thread: il worker non mantiene
         * in memoria tutte le pagine esportate.
         */
        workerScope.postMessage(
          pageResponse,
          [output],
        );

        const progressResponse:
          WorkerProgressResponse = {
            id: request.id,
            type: 'progress',
            completed:
              position + 1,
            total,
            pageIndex,
          };

        workerScope.postMessage(
          progressResponse,
        );
      } finally {
        page.cleanup();
      }
    }

    const response:
      WorkerSuccess = {
        id: request.id,
        type: 'success',
      };

    workerScope.postMessage(
      response,
    );
  } finally {
    await loadingTask.destroy();
  }
}

workerScope.addEventListener(
  'message',
  (
    event:
      MessageEvent<WorkerRequest>,
  ) => {
    const request =
      event.data;

    void renderPdf(
      request,
    ).catch(
      (error) => {
        const response:
          WorkerFailure = {
            id:
              request.id,
            type:
              'failure',
            error:
              errorMessage(
                error,
              ),
          };

        workerScope.postMessage(
          response,
        );
      },
    );
  },
);
