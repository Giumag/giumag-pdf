import {
  compareRgbaPixels,
} from '@giumag/pdf-engine';

type ComparePageStatus =
  | 'same'
  | 'changed'
  | 'only-left'
  | 'only-right';

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

const workerScope =
  self as unknown as DedicatedWorkerGlobalScope;

function describeError(
  value: unknown,
) {
  if (
    value instanceof Error &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value.trim();
  }

  return 'Errore sconosciuto durante il confronto.';
}

function toMap(
  images: WorkerImage[],
) {
  return new Map(
    images.map(
      (image) => [
        image.pageIndex,
        image,
      ] as const,
    ),
  );
}

async function imageBitmap(
  image: WorkerImage,
) {
  const blob =
    new Blob(
      [image.bytes],
      {
        type:
          image.mimeType,
      },
    );

  return createImageBitmap(
    blob,
  );
}

function createCanvas(
  width: number,
  height: number,
) {
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
      'Canvas confronto non disponibile.',
    );
  }

  context.fillStyle =
    '#ffffff';

  context.fillRect(
    0,
    0,
    width,
    height,
  );

  return {
    canvas,
    context,
  };
}

async function comparePage(
  pageIndex: number,
  left: WorkerImage | undefined,
  right: WorkerImage | undefined,
  threshold: number,
): Promise<WorkerPageResult> {
  if (
    left &&
    !right
  ) {
    return {
      pageIndex,
      status:
        'only-left',
      differencePercent:
        100,
    };
  }

  if (
    !left &&
    right
  ) {
    return {
      pageIndex,
      status:
        'only-right',
      differencePercent:
        100,
    };
  }

  if (
    !left ||
    !right
  ) {
    throw new Error(
      `Pagina ${pageIndex + 1} non valida.`,
    );
  }

  const width =
    Math.max(
      left.width,
      right.width,
    );

  const height =
    Math.max(
      left.height,
      right.height,
    );

  const [
    leftBitmap,
    rightBitmap,
  ] =
    await Promise.all([
      imageBitmap(left),
      imageBitmap(right),
    ]);

  try {
    const leftCanvas =
      createCanvas(
        width,
        height,
      );

    const rightCanvas =
      createCanvas(
        width,
        height,
      );

    leftCanvas.context.drawImage(
      leftBitmap,
      0,
      0,
      left.width,
      left.height,
    );

    rightCanvas.context.drawImage(
      rightBitmap,
      0,
      0,
      right.width,
      right.height,
    );

    const leftData =
      leftCanvas.context.getImageData(
        0,
        0,
        width,
        height,
      );

    const rightData =
      rightCanvas.context.getImageData(
        0,
        0,
        width,
        height,
      );

    const difference =
      compareRgbaPixels(
        leftData.data,
        rightData.data,
        {
          threshold,
        },
      );

    if (
      difference.differentPixels ===
      0
    ) {
      return {
        pageIndex,
        status:
          'same',
        differencePercent:
          0,
      };
    }

    const diffCanvas =
      new OffscreenCanvas(
        width,
        height,
      );

    const diffContext =
      diffCanvas.getContext(
        '2d',
      );

    if (!diffContext) {
      throw new Error(
        'Impossibile creare la mappa delle differenze.',
      );
    }

    const diffData =
      diffContext.createImageData(
        width,
        height,
      );

    for (
      let pixelIndex = 0;
      pixelIndex <
        difference.mask.length;
      pixelIndex += 1
    ) {
      if (
        difference.mask[pixelIndex] ===
        0
      ) {
        continue;
      }

      const offset =
        pixelIndex * 4;

      diffData.data[offset] =
        255;

      diffData.data[offset + 1] =
        59;

      diffData.data[offset + 2] =
        48;

      diffData.data[offset + 3] =
        225;
    }

    diffContext.putImageData(
      diffData,
      0,
      0,
    );

    const blob =
      await diffCanvas.convertToBlob({
        type:
          'image/png',
      });

    const diffBytes =
      await blob.arrayBuffer();

    return {
      pageIndex,
      status:
        'changed',
      differencePercent:
        difference.differencePercent,
      diffBytes,
    };
  } finally {
    leftBitmap.close();
    rightBitmap.close();
  }
}

async function run(
  request: WorkerRequest,
) {
  if (
    typeof OffscreenCanvas ===
      'undefined' ||
    typeof createImageBitmap ===
      'undefined'
  ) {
    throw new Error(
      'Il browser non supporta il confronto PDF richiesto.',
    );
  }

  const left =
    toMap(request.left);

  const right =
    toMap(request.right);

  const pageIndexes =
    new Set<number>([
      ...left.keys(),
      ...right.keys(),
    ]);

  const ordered =
    [...pageIndexes].sort(
      (a, b) =>
        a - b,
    );

  const pages:
    WorkerPageResult[] =
    [];

  for (
    let position = 0;
    position < ordered.length;
    position += 1
  ) {
    const pageIndex =
      ordered[position];

    if (
      pageIndex ===
      undefined
    ) {
      continue;
    }

    const page =
      await comparePage(
        pageIndex,
        left.get(pageIndex),
        right.get(pageIndex),
        request.threshold,
      );

    pages.push(page);

    const progress:
      WorkerResponse = {
        type:
          'progress',
        completed:
          position + 1,
        total:
          ordered.length,
      };

    workerScope.postMessage(
      progress,
    );
  }

  return pages;
}

workerScope.addEventListener(
  'message',
  (
    event:
      MessageEvent<WorkerRequest>,
  ) => {
    void run(event.data)
      .then(
        (pages) => {
          const transfer:
            Transferable[] =
            [];

          for (
            const page of pages
          ) {
            if (
              page.diffBytes
            ) {
              transfer.push(
                page.diffBytes,
              );
            }
          }

          const response:
            WorkerResponse = {
              type:
                'success',
              pages,
            };

          workerScope.postMessage(
            response,
            transfer,
          );
        },
      )
      .catch(
        (error) => {
          const response:
            WorkerResponse = {
              type:
                'failure',
              error:
                describeError(
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