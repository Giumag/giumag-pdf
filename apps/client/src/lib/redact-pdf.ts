import {
  PdfToImagesWorkerClient,
  type PdfToImagesRenderedImage,
} from './pdf-to-images-worker';

export interface RedactionArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactPdfPageSpec {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  redactions: RedactionArea[];
}

export type RedactPdfPhase =
  | 'rendering'
  | 'building';

export interface RedactPdfProgress {
  phase: RedactPdfPhase;
  completed: number;
  total: number;
  percent: number;
}

export interface RedactPdfCallbacks {
  onProgress?: (
    progress: RedactPdfProgress,
  ) => void;
}

export interface RedactBuildImage {
  pageIndex: number;
  width: number;
  height: number;
  mimeType:
    | 'image/png'
    | 'image/jpeg';
  bytes: ArrayBuffer;
}

export interface RedactBuildRequest {
  images: RedactBuildImage[];
  pages: RedactPdfPageSpec[];
}

export type RedactBuildResponse =
  | {
      ok: true;
      bytes: ArrayBuffer;
    }
  | {
      ok: false;
      error: string;
    };

function closeRenderer(
  renderer: PdfToImagesWorkerClient,
) {
  const candidate =
    renderer as unknown as {
      terminate?: () => void;
      close?: () => void;
      dispose?: () => void;
    };

  try {
    if (
      typeof candidate.terminate ===
      'function'
    ) {
      candidate.terminate();
      return;
    }

    if (
      typeof candidate.close ===
      'function'
    ) {
      candidate.close();
      return;
    }

    if (
      typeof candidate.dispose ===
      'function'
    ) {
      candidate.dispose();
    }
  } catch {
    // La pulizia non deve nascondere
    // l'esito dell'elaborazione.
  }
}

function buildRedactedPdf(
  images: PdfToImagesRenderedImage[],
  pages: RedactPdfPageSpec[],
): Promise<Uint8Array> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const worker =
        new Worker(
          new URL(
            '../workers/redact-pdf-build.worker.ts',
            import.meta.url,
          ),
          {
            type: 'module',
            name:
              'giumag-redact-pdf-build',
          },
        );

      const cleanup = () => {
        worker.terminate();
      };

      worker.addEventListener(
        'message',
        (
          event:
            MessageEvent<RedactBuildResponse>,
        ) => {
          const response =
            event.data;

          cleanup();

          if (!response.ok) {
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
        {
          once: true,
        },
      );

      worker.addEventListener(
        'error',
        (event) => {
          cleanup();

          reject(
            new Error(
              event.message ||
                'Errore durante la ricostruzione sicura del PDF.',
            ),
          );
        },
        {
          once: true,
        },
      );

      const transfer:
        Transferable[] = [];

      const workerImages:
        RedactBuildImage[] =
        images.map(
          (image) => {
            const copy =
              new Uint8Array(
                image.bytes.byteLength,
              );

            copy.set(
              image.bytes,
            );

            transfer.push(
              copy.buffer,
            );

            return {
              pageIndex:
                image.pageIndex,
              width:
                image.width,
              height:
                image.height,
              mimeType:
                image.mimeType,
              bytes:
                copy.buffer,
            };
          },
        );

      const request:
        RedactBuildRequest = {
          images:
            workerImages,
          pages:
            pages.map(
              (page) => ({
                ...page,
                redactions:
                  page.redactions.map(
                    (redaction) => ({
                      ...redaction,
                    }),
                  ),
              }),
            ),
        };

      worker.postMessage(
        request,
        transfer,
      );
    },
  );
}

export async function redactPdf(
  bytes: Uint8Array,
  pages: RedactPdfPageSpec[],
  callbacks: RedactPdfCallbacks = {},
): Promise<Uint8Array> {
  if (bytes.byteLength === 0) {
    throw new Error(
      'Il PDF è vuoto.',
    );
  }

  if (pages.length === 0) {
    throw new Error(
      'Il PDF non contiene pagine.',
    );
  }

  const redactionCount =
    pages.reduce(
      (
        total,
        page,
      ) =>
        total +
        page.redactions.length,
      0,
    );

  if (
    redactionCount === 0
  ) {
    throw new Error(
      'Disegna almeno un’area da oscurare.',
    );
  }

  const renderer =
    new PdfToImagesWorkerClient();

  try {
    callbacks.onProgress?.({
      phase:
        'rendering',
      completed: 0,
      total:
        pages.length,
      percent: 0,
    });

    const images =
      await renderer.render(
        bytes,
        {},
        {
          onProgress:
            (progress) => {
              const ratio =
                progress.total > 0
                  ? progress.completed /
                    progress.total
                  : 0;

              callbacks
                .onProgress?.({
                  phase:
                    'rendering',
                  completed:
                    progress.completed,
                  total:
                    progress.total,
                  percent:
                    Math.min(
                      84,
                      Math.round(
                        ratio * 84,
                      ),
                    ),
                });
            },
        },
      );

    if (
      images.length !==
      pages.length
    ) {
      throw new Error(
        'Il numero di pagine renderizzate non coincide con il documento.',
      );
    }

    callbacks.onProgress?.({
      phase:
        'building',
      completed:
        images.length,
      total:
        images.length,
      percent: 90,
    });

    const result =
      await buildRedactedPdf(
        images,
        pages,
      );

    callbacks.onProgress?.({
      phase:
        'building',
      completed:
        images.length,
      total:
        images.length,
      percent: 100,
    });

    return result;
  } finally {
    closeRenderer(
      renderer,
    );
  }
}