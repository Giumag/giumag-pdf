import type {
  FillPdfFormOptions,
  PdfFormSummary,
  PdfFormValueUpdate,
} from '@giumag/pdf-engine';

export type FormsPdfWorkerRequest =
  | {
      action: 'inspect';
      bytes: Uint8Array;
    }
  | {
      action: 'fill';
      bytes: Uint8Array;
      updates: PdfFormValueUpdate[];
      options: FillPdfFormOptions;
    };

export type FormsPdfWorkerResponse =
  | {
      ok: true;
      result:
        | PdfFormSummary
        | Uint8Array;
    }
  | {
      ok: false;
      error: string;
    };

function runWorker<T>(
  request: FormsPdfWorkerRequest,
): Promise<T> {
  return new Promise(
    (resolve, reject) => {
      const worker =
        new Worker(
          new URL(
            '../workers/forms-pdf.worker.ts',
            import.meta.url,
          ),
          {
            type: 'module',
          },
        );

      worker.onmessage = (
        event:
          MessageEvent<
            FormsPdfWorkerResponse
          >,
      ) => {
        worker.terminate();

        if (!event.data.ok) {
          reject(
            new Error(
              event.data.error,
            ),
          );

          return;
        }

        resolve(
          event.data.result as T,
        );
      };

      worker.onerror = (
        event,
      ) => {
        worker.terminate();

        reject(
          new Error(
            event.message ||
              'Il worker Moduli PDF si è interrotto.',
          ),
        );
      };

      worker.postMessage(
        request,
      );
    },
  );
}

export function inspectPdfFormWorker(
  bytes: Uint8Array,
) {
  return runWorker<PdfFormSummary>({
    action: 'inspect',
    bytes,
  });
}

export function fillPdfFormWorker(
  bytes: Uint8Array,
  updates: PdfFormValueUpdate[],
  options: FillPdfFormOptions,
) {
  return runWorker<Uint8Array>({
    action: 'fill',
    bytes,
    updates,
    options,
  });
}