import {
  BrowserPdfEngine,
  type ImagesToPdfOptions,
  type PageRotation,
  type PdfImageFormat,
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

interface ImagesWorkerScope {
  addEventListener(
    type: 'message',
    listener: (
      event:
        MessageEvent<WorkerRequest>,
    ) => void,
  ): void;

  postMessage(
    message:
      | WorkerSuccess
      | WorkerFailure,
    transfer?: Transferable[],
  ): void;
}

const workerScope =
  self as unknown as
    ImagesWorkerScope;

const engine =
  new BrowserPdfEngine();

function errorMessage(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Impossibile creare il PDF.';
}

workerScope.addEventListener(
  'message',
  async (
    event:
      MessageEvent<WorkerRequest>,
  ) => {
    const {
      id,
      images,
      options,
    } = event.data;

    try {
      const result =
        await engine.imagesToPdf(
          images.map(
            (image) => ({
              bytes:
                new Uint8Array(
                  image.bytes,
                ),
              format:
                image.format,
              rotation:
                image.rotation,
            }),
          ),
          options,
        );

      const output =
        result.buffer.slice(
          result.byteOffset,
          result.byteOffset +
            result.byteLength,
        ) as ArrayBuffer;

      const response:
        WorkerSuccess = {
          id,
          ok: true,
          bytes: output,
        };

      workerScope.postMessage(
        response,
        [output],
      );
    } catch (error) {
      const response:
        WorkerFailure = {
          id,
          ok: false,
          error:
            errorMessage(error),
        };

      workerScope.postMessage(
        response,
      );
    }
  },
);