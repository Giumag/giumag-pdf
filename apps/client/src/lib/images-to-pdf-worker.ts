import type {
  ImagesToPdfOptions,
  PdfImageFormat,
  PageRotation,
} from '@giumag/pdf-engine';

interface WorkerImage {
  bytes: ArrayBuffer;
  format: PdfImageFormat;
  rotation: PageRotation;
}

interface WorkerRequest {
  id: number;
  images: WorkerImage[];
  options: ImagesToPdfOptions;
}

interface WorkerSuccess {
  id: number;
  ok: true;
  bytes: ArrayBuffer;
}

interface WorkerFailure {
  id: number;
  ok: false;
  error: string;
}

type WorkerResponse =
  | WorkerSuccess
  | WorkerFailure;

interface PendingRequest {
  resolve: (
    bytes: Uint8Array,
  ) => void;

  reject: (
    error: Error,
  ) => void;
}

export interface ImagesToPdfWorkerImage {
  bytes: Uint8Array;
  format: PdfImageFormat;
  rotation: PageRotation;
}

export class ImagesToPdfWorkerClient {
  private readonly worker: Worker;

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
          '../workers/images-to-pdf.worker.ts',
          import.meta.url,
        ),
        {
          type: 'module',
          name: 'giumag-images-to-pdf',
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

        this.pending.delete(
          response.id,
        );

        if (response.ok) {
          request.resolve(
            new Uint8Array(
              response.bytes,
            ),
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
              'Il motore Immagini in PDF si è arrestato.',
          );

        for (
          const request
          of this.pending.values()
        ) {
          request.reject(error);
        }

        this.pending.clear();
      },
    );
  }

  generate(
    images: ImagesToPdfWorkerImage[],
    options: ImagesToPdfOptions,
  ): Promise<Uint8Array> {
    if (this.closed) {
      return Promise.reject(
        new Error(
          'Il motore Immagini in PDF non è più disponibile.',
        ),
      );
    }

    const id = this.nextId;
    this.nextId += 1;

    const workerImages:
      WorkerImage[] = [];

    const transfer:
      Transferable[] = [];

    for (const image of images) {
      const copy =
        new Uint8Array(
          image.bytes.byteLength,
        );

      copy.set(image.bytes);

      workerImages.push({
        bytes: copy.buffer,
        format: image.format,
        rotation: image.rotation,
      });

      transfer.push(
        copy.buffer,
      );
    }

    const request:
      WorkerRequest = {
        id,
        images: workerImages,
        options,
      };

    return new Promise(
      (resolve, reject) => {
        this.pending.set(
          id,
          {
            resolve,
            reject,
          },
        );

        this.worker.postMessage(
          request,
          transfer,
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
        'Generazione PDF annullata.',
      );

    for (
      const request
      of this.pending.values()
    ) {
      request.reject(error);
    }

    this.pending.clear();
  }
}