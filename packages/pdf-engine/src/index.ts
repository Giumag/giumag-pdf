import { PDFDocument, degrees } from 'pdf-lib';

export type Bytes = Uint8Array;
export type PageRotation = 0 | 90 | 180 | 270;
export type CompressionPreset =
  | 'light'
  | 'recommended'
  | 'strong';
export type PdfImageFormat =
  | 'jpeg'
  | 'png';

export type ImagesPdfPageSize =
  | 'auto'
  | 'a4'
  | 'letter';

export type ImagesPdfOrientation =
  | 'auto'
  | 'portrait'
  | 'landscape';

export type ImagesPdfFit =
  | 'contain'
  | 'cover';

export interface PdfImageSource {
  bytes: Bytes;
  format: PdfImageFormat;
  rotation?: PageRotation;
}

export interface ImagesToPdfOptions {
  pageSize?: ImagesPdfPageSize;
  orientation?: ImagesPdfOrientation;
  margin?: number;
  fit?: ImagesPdfFit;
}

export interface PageTransform {
  sourceIndex: number;
  rotation: PageRotation;
}

export interface PageCrop {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfEngine {
  merge(files: Bytes[]): Promise<Bytes>;
  rotate(file: Bytes, pageIndexes: number[], clockwiseDegrees: 90 | 180 | 270): Promise<Bytes>;
  removePages(file: Bytes, pageIndexes: number[]): Promise<Bytes>;
  organize(file: Bytes, pages: PageTransform[]): Promise<Bytes>;
  extract(file: Bytes, pages: PageTransform[]): Promise<Bytes>;
  crop(file: Bytes, crops: PageCrop[]): Promise<Bytes>;
  compress(
    file: Bytes,
    preset?: CompressionPreset,
  ): Promise<Bytes>;
  imagesToPdf(
    images: PdfImageSource[],
    options?: ImagesToPdfOptions,
  ): Promise<Bytes>;
}

function validateTransforms(pageCount: number, pages: PageTransform[]) {
  if (pages.length === 0) {
    throw new Error('Un PDF deve contenere almeno una pagina.');
  }

  for (const page of pages) {
    if (
      !Number.isInteger(page.sourceIndex) ||
      page.sourceIndex < 0 ||
      page.sourceIndex >= pageCount
    ) {
      throw new Error(
        `Indice pagina sorgente non valido: ${page.sourceIndex}`,
      );
    }
  }
}

function validateCrop(pageCount: number, crop: PageCrop) {
  if (
    !Number.isInteger(crop.pageIndex) ||
    crop.pageIndex < 0 ||
    crop.pageIndex >= pageCount
  ) {
    throw new Error(
      `Indice pagina da ritagliare non valido: ${crop.pageIndex}`,
    );
  }

  if (
    !Number.isFinite(crop.x) ||
    !Number.isFinite(crop.y) ||
    !Number.isFinite(crop.width) ||
    !Number.isFinite(crop.height)
  ) {
    throw new Error('Coordinate di ritaglio non valide.');
  }

  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error(
      'L?area di ritaglio deve avere larghezza e altezza maggiori di zero.',
    );
  }
}

function validateCompressionPreset(
  preset: CompressionPreset,
): CompressionPreset {
  if (
    preset !== 'light' &&
    preset !== 'recommended' &&
    preset !== 'strong'
  ) {
    throw new Error(
      'Livello di compressione non valido.',
    );
  }

  return preset;
}

async function createCompressionToolkit() {
  const { createPdfToolkit } = await import('pdfstudio');

  return createPdfToolkit();
}

let compressionToolkitPromise:
  | ReturnType<typeof createCompressionToolkit>
  | null = null;

function getCompressionToolkit() {
  if (!compressionToolkitPromise) {
    compressionToolkitPromise = createCompressionToolkit();
  }

  return compressionToolkitPromise;
}

function qpdfCompressionArgs(
  preset: Exclude<CompressionPreset, 'light'>,
): string[] {
  const jpegQuality =
    preset === 'recommended'
      ? 78
      : 55;

  return [
    '--compress-streams=y',
    '--decode-level=generalized',
    '--recompress-flate',
    '--compression-level=9',
    '--object-streams=generate',
    '--optimize-images',
    '--jpeg-quality=' + jpegQuality,
    '$in0',
    '$out',
  ];
}

const IMAGES_TO_PDF_A4_SIZE:
  readonly [number, number] = [
    595.28,
    841.89,
  ];

const IMAGES_TO_PDF_LETTER_SIZE:
  readonly [number, number] = [
    612,
    792,
  ];

function validateImagesToPdfOptions(
  options: ImagesToPdfOptions,
) {
  const margin = options.margin ?? 24;
  const pageSize = options.pageSize ?? 'auto';
  const orientation =
    options.orientation ?? 'auto';
  const fit = options.fit ?? 'contain';

  if (
    !Number.isFinite(margin) ||
    margin < 0
  ) {
    throw new Error(
      'Il margine deve essere maggiore o uguale a zero.',
    );
  }

  if (
    pageSize !== 'auto' &&
    pageSize !== 'a4' &&
    pageSize !== 'letter'
  ) {
    throw new Error(
      'Formato pagina non valido.',
    );
  }

  if (
    orientation !== 'auto' &&
    orientation !== 'portrait' &&
    orientation !== 'landscape'
  ) {
    throw new Error(
      'Orientamento pagina non valido.',
    );
  }

  if (
    fit !== 'contain' &&
    fit !== 'cover'
  ) {
    throw new Error(
      'Modalità di adattamento non valida.',
    );
  }

  return {
    margin,
    pageSize,
    orientation,
    fit,
  } as const;
}

function rotatedImageDimensions(
  width: number,
  height: number,
  rotation: PageRotation,
) {
  if (
    rotation === 90 ||
    rotation === 270
  ) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

function resolveImagesPdfPageSize(
  pageSize: ImagesPdfPageSize,
  orientation: ImagesPdfOrientation,
  imageWidth: number,
  imageHeight: number,
  margin: number,
): [number, number] {
  if (pageSize === 'auto') {
    let width =
      imageWidth + margin * 2;

    let height =
      imageHeight + margin * 2;

    if (
      orientation === 'portrait' &&
      width > height
    ) {
      [width, height] = [height, width];
    }

    if (
      orientation === 'landscape' &&
      height > width
    ) {
      [width, height] = [height, width];
    }

    return [width, height];
  }

  const base =
    pageSize === 'a4'
      ? IMAGES_TO_PDF_A4_SIZE
      : IMAGES_TO_PDF_LETTER_SIZE;

  const landscape =
    orientation === 'landscape' ||
    (
      orientation === 'auto' &&
      imageWidth > imageHeight
    );

  return landscape
    ? [base[1], base[0]]
    : [base[0], base[1]];
}
export class BrowserPdfEngine implements PdfEngine {
  async merge(files: Bytes[]): Promise<Bytes> {
    const output = await PDFDocument.create();

    for (const bytes of files) {
      const source = await PDFDocument.load(bytes);

      const pages = await output.copyPages(
        source,
        source.getPageIndices(),
      );

      pages.forEach((page) => output.addPage(page));
    }

    return output.save();
  }

  async rotate(
    file: Bytes,
    pageIndexes: number[],
    clockwiseDegrees: 90 | 180 | 270,
  ): Promise<Bytes> {
    const doc = await PDFDocument.load(file);
    const selected = new Set(pageIndexes);

    doc.getPages().forEach((page, index) => {
      if (!selected.has(index)) {
        return;
      }

      const current = page.getRotation().angle;

      page.setRotation(
        degrees((current + clockwiseDegrees) % 360),
      );
    });

    return doc.save();
  }

  async removePages(
    file: Bytes,
    pageIndexes: number[],
  ): Promise<Bytes> {
    const doc = await PDFDocument.load(file);
    const pageCount = doc.getPageCount();
    const uniqueIndexes = [...new Set(pageIndexes)];

    for (const index of uniqueIndexes) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= pageCount
      ) {
        throw new Error(
          `Indice pagina da rimuovere non valido: ${index}`,
        );
      }
    }

    if (uniqueIndexes.length >= pageCount) {
      throw new Error(
        'Un PDF deve contenere almeno una pagina.',
      );
    }

    uniqueIndexes
      .sort((a, b) => b - a)
      .forEach((index) => doc.removePage(index));

    return doc.save();
  }

  async organize(
    file: Bytes,
    pages: PageTransform[],
  ): Promise<Bytes> {
    const source = await PDFDocument.load(file);

    validateTransforms(
      source.getPageCount(),
      pages,
    );

    const output = await PDFDocument.create();

    const copiedPages = await output.copyPages(
      source,
      pages.map((page) => page.sourceIndex),
    );

    copiedPages.forEach((page, index) => {
      const transform = pages[index];
      const current = page.getRotation().angle;

      page.setRotation(
        degrees(
          (current + transform.rotation) % 360,
        ),
      );

      output.addPage(page);
    });

    return output.save();
  }

  async extract(
    file: Bytes,
    pages: PageTransform[],
  ): Promise<Bytes> {
    return this.organize(file, pages);
  }

  async crop(
    file: Bytes,
    crops: PageCrop[],
  ): Promise<Bytes> {
    const doc = await PDFDocument.load(file);
    const pageCount = doc.getPageCount();

    for (const crop of crops) {
      validateCrop(pageCount, crop);

      const page = doc.getPage(crop.pageIndex);

      page.setCropBox(
        crop.x,
        crop.y,
        crop.width,
        crop.height,
      );
    }

    return doc.save();
  }

  async compress(
    file: Bytes,
    preset: CompressionPreset = 'recommended',
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da comprimere è vuoto.',
      );
    }

    const selectedPreset =
      validateCompressionPreset(preset);

    const toolkit =
      await getCompressionToolkit();

    if (selectedPreset === 'light') {
      return toolkit.compress(file);
    }

    const {
      recompressEmbeddedJpegs,
    } = await import('./compress-images');

    const imageOptimized =
      await recompressEmbeddedJpegs(
        file,
        selectedPreset,
      );

    return toolkit.raw(
      [imageOptimized],
      qpdfCompressionArgs(selectedPreset),
    );
  }

  async imagesToPdf(
    images: PdfImageSource[],
    options: ImagesToPdfOptions = {},
  ): Promise<Bytes> {
    if (images.length === 0) {
      throw new Error(
        'Aggiungi almeno un’immagine.',
      );
    }

    const {
      margin,
      pageSize,
      orientation,
      fit,
    } = validateImagesToPdfOptions(options);

    const output =
      await PDFDocument.create();

    for (const source of images) {
      if (source.bytes.byteLength === 0) {
        throw new Error(
          'Una delle immagini è vuota.',
        );
      }

      if (
        source.format !== 'jpeg' &&
        source.format !== 'png'
      ) {
        throw new Error(
          'Formato immagine non supportato.',
        );
      }

      const rotation =
        source.rotation ?? 0;

      if (
        rotation !== 0 &&
        rotation !== 90 &&
        rotation !== 180 &&
        rotation !== 270
      ) {
        throw new Error(
          'Rotazione immagine non valida.',
        );
      }

      const embedded =
        source.format === 'jpeg'
          ? await output.embedJpg(source.bytes)
          : await output.embedPng(source.bytes);

      const rotated =
        rotatedImageDimensions(
          embedded.width,
          embedded.height,
          rotation,
        );

      /*
       * In modalità cover il contenuto riempie
       * l'intera pagina, quindi il margine visivo
       * viene intenzionalmente ignorato.
       */
      const contentMargin =
        fit === 'cover'
          ? 0
          : margin;

      const [
        pageWidth,
        pageHeight,
      ] = resolveImagesPdfPageSize(
        pageSize,
        orientation,
        rotated.width,
        rotated.height,
        contentMargin,
      );

      const availableWidth =
        pageWidth -
        contentMargin * 2;

      const availableHeight =
        pageHeight -
        contentMargin * 2;

      if (
        availableWidth <= 0 ||
        availableHeight <= 0
      ) {
        throw new Error(
          'Il margine è troppo grande per il formato pagina selezionato.',
        );
      }

      const scaleX =
        availableWidth /
        rotated.width;

      const scaleY =
        availableHeight /
        rotated.height;

      const scale =
        fit === 'cover'
          ? Math.max(
              scaleX,
              scaleY,
            )
          : Math.min(
              scaleX,
              scaleY,
            );

      const drawWidth =
        embedded.width * scale;

      const drawHeight =
        embedded.height * scale;

      const page =
        output.addPage([
          pageWidth,
          pageHeight,
        ]);

      if (rotation === 0) {
        page.drawImage(
          embedded,
          {
            x:
              (pageWidth -
                drawWidth) / 2,
            y:
              (pageHeight -
                drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          },
        );

        continue;
      }

      if (rotation === 90) {
        page.drawImage(
          embedded,
          {
            x:
              (pageWidth +
                drawHeight) / 2,
            y:
              (pageHeight -
                drawWidth) / 2,
            width: drawWidth,
            height: drawHeight,
            rotate: degrees(90),
          },
        );

        continue;
      }

      if (rotation === 180) {
        page.drawImage(
          embedded,
          {
            x:
              (pageWidth +
                drawWidth) / 2,
            y:
              (pageHeight +
                drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
            rotate: degrees(180),
          },
        );

        continue;
      }

      page.drawImage(
        embedded,
        {
          x:
            (pageWidth -
              drawHeight) / 2,
          y:
            (pageHeight +
              drawWidth) / 2,
          width: drawWidth,
          height: drawHeight,
          rotate: degrees(270),
        },
      );
    }

    return output.save();
  }
}
