export type PdfToImagesFormat =
  | 'png'
  | 'jpeg';

export interface PdfToImagesOptions {
  /**
   * Indici pagina 0-based.
   *
   * undefined = tutte le pagine.
   * [] = selezione non valida.
   */
  pageIndexes?: number[];

  /**
   * Formato immagine finale.
   *
   * Default: png.
   */
  format?: PdfToImagesFormat;

  /**
   * Fattore di scala rispetto ai 72 DPI
   * nativi del PDF.
   *
   * 1 = 72 DPI
   * 2 = 144 DPI
   * 3 = 216 DPI
   * 4 = 288 DPI
   *
   * Default: 2.
   */
  scale?: number;

  /**
   * Qualita JPEG nell'intervallo 0.1 - 1.
   *
   * Viene ignorata per PNG.
   *
   * Default: 0.9.
   */
  jpegQuality?: number;
}

export interface NormalizedPdfToImagesOptions {
  pageIndexes?: number[];
  format: PdfToImagesFormat;
  scale: number;
  jpegQuality: number;
}

export const PDF_TO_IMAGES_MIN_SCALE = 0.5;
export const PDF_TO_IMAGES_MAX_SCALE = 4;
export const PDF_TO_IMAGES_DEFAULT_SCALE = 2;

export const PDF_TO_IMAGES_MIN_JPEG_QUALITY = 0.1;
export const PDF_TO_IMAGES_MAX_JPEG_QUALITY = 1;
export const PDF_TO_IMAGES_DEFAULT_JPEG_QUALITY = 0.9;

export function normalizePdfToImagesOptions(
  options: PdfToImagesOptions = {},
): NormalizedPdfToImagesOptions {
  const format =
    options.format ?? 'png';

  const scale =
    options.scale ??
    PDF_TO_IMAGES_DEFAULT_SCALE;

  const jpegQuality =
    options.jpegQuality ??
    PDF_TO_IMAGES_DEFAULT_JPEG_QUALITY;

  if (
    format !== 'png' &&
    format !== 'jpeg'
  ) {
    throw new Error(
      'Formato immagine non supportato.',
    );
  }

  if (
    !Number.isFinite(scale) ||
    scale <
      PDF_TO_IMAGES_MIN_SCALE ||
    scale >
      PDF_TO_IMAGES_MAX_SCALE
  ) {
    throw new Error(
      `La scala deve essere compresa tra ${PDF_TO_IMAGES_MIN_SCALE} e ${PDF_TO_IMAGES_MAX_SCALE}.`,
    );
  }

  if (
    !Number.isFinite(
      jpegQuality,
    ) ||
    jpegQuality <
      PDF_TO_IMAGES_MIN_JPEG_QUALITY ||
    jpegQuality >
      PDF_TO_IMAGES_MAX_JPEG_QUALITY
  ) {
    throw new Error(
      'La qualita JPEG deve essere compresa tra 0.1 e 1.',
    );
  }

  if (
    options.pageIndexes &&
    options.pageIndexes.length === 0
  ) {
    throw new Error(
      'Seleziona almeno una pagina.',
    );
  }

  return {
    pageIndexes:
      options.pageIndexes
        ? [...options.pageIndexes]
        : undefined,
    format,
    scale,
    jpegQuality,
  };
}

export function resolvePdfToImagesPageIndexes(
  pageCount: number,
  requested?: number[],
): number[] {
  if (
    !Number.isInteger(pageCount) ||
    pageCount <= 0
  ) {
    throw new Error(
      'Il PDF non contiene pagine esportabili.',
    );
  }

  if (requested === undefined) {
    return Array.from(
      {
        length: pageCount,
      },
      (_, index) => index,
    );
  }

  if (requested.length === 0) {
    throw new Error(
      'Seleziona almeno una pagina.',
    );
  }

  const unique =
    new Set<number>();

  for (const pageIndex of requested) {
    if (
      !Number.isInteger(
        pageIndex,
      ) ||
      pageIndex < 0 ||
      pageIndex >= pageCount
    ) {
      throw new Error(
        `Indice pagina non valido: ${pageIndex}`,
      );
    }

    unique.add(pageIndex);
  }

  return [...unique].sort(
    (a, b) => a - b,
  );
}

export function pdfToImagesMimeType(
  format: PdfToImagesFormat,
): 'image/png' | 'image/jpeg' {
  return format === 'png'
    ? 'image/png'
    : 'image/jpeg';
}

export function pdfToImagesExtension(
  format: PdfToImagesFormat,
): 'png' | 'jpg' {
  return format === 'png'
    ? 'png'
    : 'jpg';
}

export function pdfToImagesDpi(
  scale: number,
): number {
  return Math.round(
    scale * 72,
  );
}
