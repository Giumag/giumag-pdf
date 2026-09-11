import type {
  VisualSignatureMimeType,
  VisualSignaturePlacement,
} from '@giumag/pdf-engine';

export type {
  VisualSignatureMimeType,
  VisualSignaturePlacement,
};

interface WorkerSuccess {
  id: number;
  ok: true;
  bytes: Uint8Array;
}

interface WorkerFailure {
  id: number;
  ok: false;
  error: string;
}

type WorkerResponse =
  | WorkerSuccess
  | WorkerFailure;

let nextRequestId = 1;

export async function buildVisualSignaturePdf(
  pdfBytes: Uint8Array,
  signatureBytes: Uint8Array,
  mimeType: VisualSignatureMimeType,
  placements: VisualSignaturePlacement[],
): Promise<Uint8Array> {
  const worker = new Worker(
    new URL(
      '../workers/visual-signature.worker.ts',
      import.meta.url,
    ),
    {
      type: 'module',
      name: 'giumag-visual-signature',
    },
  );

  const id = nextRequestId++;
  const pdfCopy = pdfBytes.slice();
  const signatureCopy = signatureBytes.slice();

  try {
    return await new Promise<Uint8Array>(
      (resolve, reject) => {
        worker.addEventListener(
          'message',
          (
            event: MessageEvent<WorkerResponse>,
          ) => {
            const response = event.data;

            if (response.id !== id) {
              return;
            }

            if (!response.ok) {
              reject(
                new Error(response.error),
              );
              return;
            }

            resolve(response.bytes);
          },
        );

        worker.addEventListener(
          'error',
          (event) => {
            reject(
              new Error(
                event.message ||
                  'Errore nel worker Firma visiva.',
              ),
            );
          },
          {
            once: true,
          },
        );

        worker.postMessage(
          {
            id,
            pdfBytes: pdfCopy,
            signatureBytes:
              signatureCopy,
            mimeType,
            placements,
          },
          [
            pdfCopy.buffer,
            signatureCopy.buffer,
          ],
        );
      },
    );
  } finally {
    worker.terminate();
  }
}