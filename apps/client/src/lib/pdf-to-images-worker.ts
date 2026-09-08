import type {
  PdfToImagesFormat,
  PdfToImagesOptions,
} from './pdf-to-images';

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

export interface PdfToImagesRenderedImage {
  /**
   * Indice originale della pagina PDF,
   * 0-based.
   */
  pageIndex: number;

  width: number;
  height: number;

  format: PdfToImagesFormat;

  mimeType:
    | 'image/png'
    | 'image/jpeg';

  bytes: Uint8Array;
}

export interface PdfToImagesProgress {
  completed: number;
  total: number;

  /**
   * Pagina originale appena completata,
   * 0-based.
   */
  pageIndex: number;
}

export interface PdfToImagesWorkerCallbacks {
  onPage?: (
    image:
      PdfToImagesRenderedImage,
  ) => void;

  onProgress?: (
    progress:
      PdfToImagesProgress,
  ) => void;
}

interface PendingRequest {
  resolve: (
    images:
      PdfToImagesRenderedImage[],
  ) => void;

  reject: (
    error: Error,
  ) => void;

  images:
    PdfToImagesRenderedImage[];

  callbacks:
    PdfToImagesWorkerCallbacks;
}

export class PdfToImagesWorkerClient {
  private readonly worker:
    Worker;

  private readonly pending =
    new Map<
      number,
      PendingRequest
    >();

  private nextId = 1;

  private closed = false;

  constructor() {
    this.worker =
      new Worker(
        new URL(
          '../workers/pdf-to-images.worker.ts',
          import.meta.url,
        ),
        {
          type: 'module',
          name: 'giumag-pdf-to-images',
        },
      );

    this.worker.addEventListener(
      'message',
      (
        event:
          MessageEvent<WorkerResponse>,
      ) => {
        const response =
          event.data;

        const request =
          this.pending.get(
            response.id,
          );

        if (!request) {
          return;
        }

        if (
          response.type ===
          'page'
        ) {
          const image:
            PdfToImagesRenderedImage = {
              pageIndex:
                response.image
                  .pageIndex,
              width:
                response.image
                  .width,
              height:
                response.image
                  .height,
              format:
                response.image
                  .format,
              mimeType:
                response.image
                  .mimeType,
              bytes:
                new Uint8Array(
                  response.image
                    .bytes,
                ),
            };

          request.images.push(
            image,
          );

          try {
            request.callbacks
              .onPage?.(
                image,
              );
          } catch {
            // I callback UI non devono
            // interrompere il rendering.
          }

          return;
        }

        if (
          response.type ===
          'progress'
        ) {
          try {
            request.callbacks
              .onProgress?.({
                completed:
                  response
                    .completed,
                total:
                  response.total,
                pageIndex:
                  response
                    .pageIndex,
              });
          } catch {
            // I callback UI non devono
            // interrompere il rendering.
          }

          return;
        }

        this.pending.delete(
          response.id,
        );

        if (
          response.type ===
          'success'
        ) {
          request.images.sort(
            (a, b) =>
              a.pageIndex -
              b.pageIndex,
          );

          request.resolve(
            request.images,
          );

          return;
        }

        request.reject(
          new Error(
            response.error,
          ),
        );
      },
    );

    this.worker.addEventListener(
      'error',
      (event) => {
        const error =
          new Error(
            event.message ||
              'Il motore PDF in immagini si e arrestato.',
          );

        this.closed = true;

        for (
          const request
          of this.pending.values()
        ) {
          request.reject(
            error,
          );
        }

        this.pending.clear();

        this.worker.terminate();
      },
    );
  }

  render(
    bytes: Uint8Array,
    options:
      PdfToImagesOptions = {},
    callbacks:
      PdfToImagesWorkerCallbacks = {},
  ): Promise<
    PdfToImagesRenderedImage[]
  > {
    if (this.closed) {
      return Promise.reject(
        new Error(
          'Il motore PDF in immagini non e piu disponibile.',
        ),
      );
    }

    if (
      bytes.byteLength === 0
    ) {
      return Promise.reject(
        new Error(
          'Il PDF da convertire e vuoto.',
        ),
      );
    }

    const id =
      this.nextId;

    this.nextId += 1;

    /*
     * La copia evita di trasferire e
     * quindi "detached" i byte mantenuti
     * dalla workspace.
     */
    const copy =
      new Uint8Array(
        bytes.byteLength,
      );

    copy.set(bytes);

    const request:
      WorkerRequest = {
        id,
        bytes:
          copy.buffer,
        options,
      };

    return new Promise(
      (resolve, reject) => {
        this.pending.set(
          id,
          {
            resolve,
            reject,
            images: [],
            callbacks,
          },
        );

        this.worker.postMessage(
          request,
          [
            copy.buffer,
          ],
        );
      },
    );
  }

  terminate() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    this.worker.terminate();

    const error =
      new Error(
        'Conversione PDF in immagini annullata.',
      );

    for (
      const request
      of this.pending.values()
    ) {
      request.reject(
        error,
      );
    }

    this.pending.clear();
  }
}
