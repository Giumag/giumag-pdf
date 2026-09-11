import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PDFDocument,
} from 'pdf-lib';

import {
  repairPdfDocument,
} from '../src/index';

describe('repairPdfDocument', () => {
  it('riscrive un PDF valido mantenendolo leggibile', async () => {
    const source =
      await PDFDocument.create();

    source.addPage([
      300,
      400,
    ]);

    source.setTitle(
      'Giumag repair test',
    );

    const sourceBytes =
      await source.save({
        useObjectStreams: false,
      });

    const repaired =
      await repairPdfDocument(
        sourceBytes,
      );

    expect(
      repaired.byteLength,
    ).toBeGreaterThan(0);

    const reopened =
      await PDFDocument.load(
        repaired,
      );

    expect(
      reopened.getPageCount(),
    ).toBe(1);
  });

  it('rifiuta un input vuoto', async () => {
    await expect(
      repairPdfDocument(
        new Uint8Array(),
      ),
    ).rejects.toThrow(
      'Il PDF è vuoto.',
    );
  });
});