import {
  BrowserPdfEngine,
  type OcrPdfPage,
} from '@giumag/pdf-engine';

import type {
  RedactBuildRequest,
  RedactBuildResponse,
  RedactPdfPageSpec,
  RedactionArea,
} from '../lib/redact-pdf';

const workerScope =
  self as unknown as DedicatedWorkerGlobalScope;

function errorMessage(
  value: unknown,
) {
  if (
    value instanceof Error &&
    value.message
  ) {
    return value.message;
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    value &&
    typeof value === 'object' &&
    'message' in value
  ) {
    const message =
      String(
        (
          value as {
            message?: unknown;
          }
        ).message ?? '',
      ).trim();

    if (message) {
      return message;
    }
  }

  return 'Errore sconosciuto durante l’oscuramento.';
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function validatePageSpec(
  page:
    RedactPdfPageSpec,
) {
  if (
    !Number.isInteger(
      page.pageIndex,
    ) ||
    page.pageIndex < 0
  ) {
    throw new Error(
      'Indice pagina non valido.',
    );
  }

  if (
    !Number.isFinite(
      page.pageWidth,
    ) ||
    !Number.isFinite(
      page.pageHeight,
    ) ||
    page.pageWidth <= 0 ||
    page.pageHeight <= 0
  ) {
    throw new Error(
      `Dimensioni pagina non valide per la pagina ${page.pageIndex + 1}.`,
    );
  }
}

function normalizedArea(
  area:
    RedactionArea,
) {
  const left =
    clamp(
      Math.min(
        area.x,
        area.x +
          area.width,
      ),
      0,
      1,
    );

  const top =
    clamp(
      Math.min(
        area.y,
        area.y +
          area.height,
      ),
      0,
      1,
    );

  const right =
    clamp(
      Math.max(
        area.x,
        area.x +
          area.width,
      ),
      0,
      1,
    );

  const bottom =
    clamp(
      Math.max(
        area.y,
        area.y +
          area.height,
      ),
      0,
      1,
    );

  return {
    left,
    top,
    right,
    bottom,
  };
}

async function processRequest(
  request:
    RedactBuildRequest,
) {
  if (
    typeof OffscreenCanvas ===
      'undefined' ||
    typeof createImageBitmap ===
      'undefined'
  ) {
    throw new Error(
      'Questo browser non supporta l’oscuramento PDF sicuro richiesto.',
    );
  }

  const specs =
    new Map<
      number,
      RedactPdfPageSpec
    >();

  for (
    const page of
    request.pages
  ) {
    validatePageSpec(
      page,
    );

    specs.set(
      page.pageIndex,
      page,
    );
  }

  const sortedImages =
    [...request.images]
      .sort(
        (
          first,
          second,
        ) =>
          first.pageIndex -
          second.pageIndex,
      );

  if (
    sortedImages.length !==
    request.pages.length
  ) {
    throw new Error(
      'Numero di pagine non coerente durante la ricostruzione.',
    );
  }

  const outputPages:
    OcrPdfPage[] = [];

  for (
    const image of
    sortedImages
  ) {
    const spec =
      specs.get(
        image.pageIndex,
      );

    if (!spec) {
      throw new Error(
        `Dati mancanti per la pagina ${image.pageIndex + 1}.`,
      );
    }

    if (
      !Number.isInteger(
        image.width,
      ) ||
      !Number.isInteger(
        image.height,
      ) ||
      image.width <= 0 ||
      image.height <= 0
    ) {
      throw new Error(
        `Immagine non valida per la pagina ${image.pageIndex + 1}.`,
      );
    }

    const sourceBlob =
      new Blob(
        [
          image.bytes,
        ],
        {
          type:
            image.mimeType,
        },
      );

    const bitmap =
      await createImageBitmap(
        sourceBlob,
      );

    try {
      const canvas =
        new OffscreenCanvas(
          image.width,
          image.height,
        );

      const context =
        canvas.getContext(
          '2d',
        );

      if (!context) {
        throw new Error(
          `Canvas non disponibile per la pagina ${image.pageIndex + 1}.`,
        );
      }

      context.fillStyle =
        '#ffffff';

      context.fillRect(
        0,
        0,
        image.width,
        image.height,
      );

      context.drawImage(
        bitmap,
        0,
        0,
        image.width,
        image.height,
      );

      context.fillStyle =
        '#000000';

      for (
        const area of
        spec.redactions
      ) {
        const normalized =
          normalizedArea(
            area,
          );

        /*
         * floor/ceil e un pixel di margine
         * evitano che l'antialiasing lasci
         * sottili frammenti leggibili sul bordo.
         */
        const left =
          Math.max(
            0,
            Math.floor(
              normalized.left *
                image.width,
            ) - 1,
          );

        const top =
          Math.max(
            0,
            Math.floor(
              normalized.top *
                image.height,
            ) - 1,
          );

        const right =
          Math.min(
            image.width,
            Math.ceil(
              normalized.right *
                image.width,
            ) + 1,
          );

        const bottom =
          Math.min(
            image.height,
            Math.ceil(
              normalized.bottom *
                image.height,
            ) + 1,
          );

        if (
          right <= left ||
          bottom <= top
        ) {
          continue;
        }

        context.fillRect(
          left,
          top,
          right - left,
          bottom - top,
        );
      }

      const resultBlob =
        await canvas
          .convertToBlob({
            type:
              'image/png',
          });

      const resultBytes =
        new Uint8Array(
          await resultBlob
            .arrayBuffer(),
        );

      outputPages.push({
        image: {
          bytes:
            resultBytes,
          format:
            'png',
        },
        pageWidth:
          spec.pageWidth,
        pageHeight:
          spec.pageHeight,
        pixelWidth:
          image.width,
        pixelHeight:
          image.height,
        lines: [],
      });
    } finally {
      bitmap.close();
    }
  }

  /*
   * createSearchablePdf viene riutilizzato
   * soltanto come costruttore di pagine raster
   * con dimensioni esatte.
   *
   * lines: [] significa che NON viene inserito
   * alcun livello testuale invisibile.
   *
   * Il PDF originale non viene copiato:
   * nell'output entrano solo i raster già oscurati.
   */
  const engine =
    new BrowserPdfEngine();

  return engine
    .createSearchablePdf(
      outputPages,
    );
}

workerScope.addEventListener(
  'message',
  async (
    event:
      MessageEvent<RedactBuildRequest>,
  ) => {
    try {
      const bytes =
        await processRequest(
          event.data,
        );

      const copy =
        new Uint8Array(
          bytes.byteLength,
        );

      copy.set(
        bytes,
      );

      const response:
        RedactBuildResponse = {
          ok: true,
          bytes:
            copy.buffer,
        };

      workerScope.postMessage(
        response,
        [
          copy.buffer,
        ],
      );
    } catch (error) {
      const response:
        RedactBuildResponse = {
          ok: false,
          error:
            errorMessage(
              error,
            ),
        };

      workerScope.postMessage(
        response,
      );
    }
  },
);