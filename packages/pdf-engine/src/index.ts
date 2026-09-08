import { PDFDocument, degrees } from 'pdf-lib';

export type Bytes = Uint8Array;
export type PageRotation = 0 | 90 | 180 | 270;

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
}