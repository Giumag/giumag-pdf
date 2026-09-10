import type {
  OcrPdfPage,
} from '@giumag/pdf-engine';

interface BuildRequest {
  type: 'build';
  pages: OcrPdfPage[];
}

interface BuildSuccess {
  type: 'success';
  bytes: ArrayBuffer;
}

interface BuildFailure {
  type: 'failure';
  error: string;
}

type BuildResponse =
  | BuildSuccess
  | BuildFailure;

export function buildSearchablePdfInWorker(
  pages: OcrPdfPage[],
): Promise<Uint8Array> {
  if (pages.length === 0) {
    return Promise.reject(
      new Error(
        'Nessuna pagina OCR da esportare.',
      ),
    );
  }

  return new Promise(
    (resolve, reject) => {
      const worker =
        new Worker(
          new URL(
            '../workers/ocr-pdf-build.worker.ts',
            import.meta.url,
          ),
          {
            type: 'module',
            name:
              'giumag-ocr-pdf-build',
          },
        );

      let settled = false;

      const finish = () => {
        worker.terminate();
      };

      worker.addEventListener(
        'message',
        (
          event:
            MessageEvent<BuildResponse>,
        ) => {
          if (settled) {
            return;
          }

          settled = true;

          const response =
            event.data;

          finish();

          if (
            response.type ===
            'failure'
          ) {
            reject(
              new Error(
                response.error,
              ),
            );

            return;
          }

          resolve(
            new Uint8Array(
              response.bytes,
            ),
          );
        },
      );

      worker.addEventListener(
        'error',
        (event) => {
          if (settled) {
            return;
          }

          settled = true;

          finish();

          reject(
            new Error(
              event.message ||
                'Il motore di creazione del PDF OCR si è arrestato.',
            ),
          );
        },
      );

      const request:
        BuildRequest = {
          type: 'build',
          pages,
        };

      const transfers =
        pages.map(
          (page) =>
            page.image.bytes
              .buffer as ArrayBuffer,
        );

      worker.postMessage(
        request,
        transfers,
      );
    },
  );
}