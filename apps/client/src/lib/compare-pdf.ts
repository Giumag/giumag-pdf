import {
  PdfToImagesWorkerClient,
  type PdfToImagesRenderedImage,
} from './pdf-to-images-worker';

export type ComparePageStatus =
  | 'same'
  | 'changed'
  | 'only-left'
  | 'only-right';

export interface ComparePageResult {
  pageIndex: number;
  status: ComparePageStatus;
  differencePercent: number;
  diffBytes?: Uint8Array;
}

export type ComparePdfPhase =
  | 'left'
  | 'right'
  | 'compare';

export interface ComparePdfProgress {
  phase: ComparePdfPhase;
  completed: number;
  total: number;
  percent: number;
}

export interface ComparePdfCallbacks {
  onProgress?: (
    progress: ComparePdfProgress,
  ) => void;
}

interface WorkerImage {
  pageIndex: number;
  width: number;
  height: number;
  mimeType:
    | 'image/png'
    | 'image/jpeg';
  bytes: ArrayBuffer;
}

interface WorkerRequest {
  left: WorkerImage[];
  right: WorkerImage[];
  threshold: number;
}

interface WorkerPageResult {
  pageIndex: number;
  status: ComparePageStatus;
  differencePercent: number;
  diffBytes?: ArrayBuffer;
}

type WorkerResponse =
  | {
      type: 'progress';
      completed: number;
      total: number;
    }
  | {
      type: 'success';
      pages: WorkerPageResult[];
    }
  | {
      type: 'failure';
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
    // Cleanup best effort.
  }
}

function cloneImage(
  image: PdfToImagesRenderedImage,
): WorkerImage {
  const copy =
    new Uint8Array(
      image.bytes.byteLength,
    );

  copy.set(image.bytes);

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
}

function compareRenderedPages(
  left: PdfToImagesRenderedImage[],
  right: PdfToImagesRenderedImage[],
  callbacks: ComparePdfCallbacks,
): Promise<ComparePageResult[]> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const worker =
        new Worker(
          new URL(
            '../workers/compare-pdf.worker.ts',
            import.meta.url,
          ),
          {
            type: 'module',
            name:
              'giumag-compare-pdf',
          },
        );

      const leftImages =
        left.map(cloneImage);

      const rightImages =
        right.map(cloneImage);

      const transfer: Transferable[] = [
        ...leftImages.map(
          (image) =>
            image.bytes,
        ),
        ...rightImages.map(
          (image) =>
            image.bytes,
        ),
      ];

      const cleanup = () => {
        worker.terminate();
      };

      worker.addEventListener(
        'message',
        (
          event:
            MessageEvent<WorkerResponse>,
        ) => {
          const response =
            event.data;

          if (
            response.type ===
            'progress'
          ) {
            const ratio =
              response.total > 0
                ? response.completed /
                  response.total
                : 0;

            callbacks.onProgress?.({
              phase:
                'compare',
              completed:
                response.completed,
              total:
                response.total,
              percent:
                80 +
                Math.round(
                  ratio * 20,
                ),
            });

            return;
          }

          cleanup();

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
            response.pages.map(
              (page) => ({
                pageIndex:
                  page.pageIndex,
                status:
                  page.status,
                differencePercent:
                  page.differencePercent,
                diffBytes:
                  page.diffBytes
                    ? new Uint8Array(
                        page.diffBytes,
                      )
                    : undefined,
              }),
            ),
          );
        },
      );

      worker.addEventListener(
        'error',
        (event) => {
          cleanup();

          reject(
            new Error(
              event.message ||
                'Il confronto PDF si è interrotto.',
            ),
          );
        },
        {
          once: true,
        },
      );

      const request:
        WorkerRequest = {
          left:
            leftImages,
          right:
            rightImages,
          threshold:
            28,
        };

      worker.postMessage(
        request,
        transfer,
      );
    },
  );
}

export async function comparePdfDocuments(
  leftBytes: Uint8Array,
  rightBytes: Uint8Array,
  callbacks: ComparePdfCallbacks = {},
): Promise<ComparePageResult[]> {
  if (
    leftBytes.byteLength === 0 ||
    rightBytes.byteLength === 0
  ) {
    throw new Error(
      'Carica entrambi i PDF prima del confronto.',
    );
  }

  const leftRenderer =
    new PdfToImagesWorkerClient();

  const rightRenderer =
    new PdfToImagesWorkerClient();

  try {
    callbacks.onProgress?.({
      phase: 'left',
      completed: 0,
      total: 1,
      percent: 0,
    });

    const left =
      await leftRenderer.render(
        leftBytes,
        {
          format: 'png',
          scale: 1,
        },
        {
          onProgress:
            (progress) => {
              const ratio =
                progress.total > 0
                  ? progress.completed /
                    progress.total
                  : 0;

              callbacks.onProgress?.({
                phase:
                  'left',
                completed:
                  progress.completed,
                total:
                  progress.total,
                percent:
                  Math.round(
                    ratio * 40,
                  ),
              });
            },
        },
      );

    callbacks.onProgress?.({
      phase: 'right',
      completed: 0,
      total: 1,
      percent: 40,
    });

    const right =
      await rightRenderer.render(
        rightBytes,
        {
          format: 'png',
          scale: 1,
        },
        {
          onProgress:
            (progress) => {
              const ratio =
                progress.total > 0
                  ? progress.completed /
                    progress.total
                  : 0;

              callbacks.onProgress?.({
                phase:
                  'right',
                completed:
                  progress.completed,
                total:
                  progress.total,
                percent:
                  40 +
                  Math.round(
                    ratio * 40,
                  ),
              });
            },
        },
      );

    callbacks.onProgress?.({
      phase:
        'compare',
      completed:
        0,
      total:
        Math.max(
          left.length,
          right.length,
        ),
      percent:
        80,
    });

    const result =
      await compareRenderedPages(
        left,
        right,
        callbacks,
      );

    callbacks.onProgress?.({
      phase:
        'compare',
      completed:
        result.length,
      total:
        result.length,
      percent:
        100,
    });

    return result;
  } finally {
    closeRenderer(
      leftRenderer,
    );

    closeRenderer(
      rightRenderer,
    );
  }
}