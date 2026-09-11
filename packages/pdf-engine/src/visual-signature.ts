import { PDFDocument } from 'pdf-lib';

export type VisualSignatureMimeType =
  | 'image/png'
  | 'image/jpeg';

export interface VisualSignaturePlacement {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApplyVisualSignatureOptions {
  pdfBytes: Uint8Array;
  signatureBytes: Uint8Array;
  mimeType: VisualSignatureMimeType;
  placements: VisualSignaturePlacement[];
}

function assertNormalized(
  value: number,
  label: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} deve essere compreso tra 0 e 1.`,
    );
  }
}

function validatePlacement(
  placement: VisualSignaturePlacement,
  pageCount: number,
): void {
  if (
    !Number.isInteger(placement.pageIndex) ||
    placement.pageIndex < 0 ||
    placement.pageIndex >= pageCount
  ) {
    throw new Error(
      `Pagina firma non valida: ${placement.pageIndex + 1}.`,
    );
  }

  assertNormalized(placement.x, 'x');
  assertNormalized(placement.y, 'y');
  assertNormalized(placement.width, 'width');
  assertNormalized(placement.height, 'height');

  if (
    placement.width <= 0 ||
    placement.height <= 0
  ) {
    throw new Error(
      'La firma deve avere dimensioni maggiori di zero.',
    );
  }

  if (
    placement.x + placement.width > 1.000001 ||
    placement.y + placement.height > 1.000001
  ) {
    throw new Error(
      'La firma deve rimanere entro i limiti della pagina.',
    );
  }
}

export async function applyVisualSignature(
  options: ApplyVisualSignatureOptions,
): Promise<Uint8Array> {
  if (options.pdfBytes.byteLength === 0) {
    throw new Error('Il PDF è vuoto.');
  }

  if (options.signatureBytes.byteLength === 0) {
    throw new Error('La firma è vuota.');
  }

  if (options.placements.length === 0) {
    throw new Error(
      'Aggiungi almeno una firma prima di esportare.',
    );
  }

  const document = await PDFDocument.load(
    options.pdfBytes,
  );

  const pages = document.getPages();

  for (const placement of options.placements) {
    validatePlacement(
      placement,
      pages.length,
    );
  }

  const image =
    options.mimeType === 'image/png'
      ? await document.embedPng(
          options.signatureBytes,
        )
      : await document.embedJpg(
          options.signatureBytes,
        );

  for (const placement of options.placements) {
    const page = pages[placement.pageIndex];
    const pageSize = page.getSize();

    const drawWidth =
      placement.width * pageSize.width;

    const drawHeight =
      placement.height * pageSize.height;

    const drawX =
      placement.x * pageSize.width;

    const drawY =
      pageSize.height -
      placement.y * pageSize.height -
      drawHeight;

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return document.save();
}