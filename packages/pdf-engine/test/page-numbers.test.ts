import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PDFDocument,
  degrees,
} from 'pdf-lib';

import {
  BrowserPdfEngine,
} from '../src/index';

async function createPdf() {
  const doc =
    await PDFDocument.create();

  doc.addPage([300, 500]);

  const rotated =
    doc.addPage([500, 300]);

  rotated.setRotation(
    degrees(90),
  );

  doc.addPage([320, 480]);

  return doc.save();
}

describe(
  'BrowserPdfEngine addPageNumbers',
  () => {
    const engine =
      new BrowserPdfEngine();

    it(
      'aggiunge i numeri preservando pagine e rotazioni',
      async () => {
        const source =
          await createPdf();

        const result =
          await engine.addPageNumbers(
            source,
            {
              position: 'bottom-center',
              firstPage: 1,
              startNumber: 1,
              fontSize: 11,
              margin: 24,
            },
          );

        expect(
          result.byteLength,
        ).toBeGreaterThan(0);

        const output =
          await PDFDocument.load(result);

        expect(
          output.getPageCount(),
        ).toBe(3);

        expect(
          output
            .getPage(1)
            .getRotation()
            .angle,
        ).toBe(90);
      },
    );

    it(
      'può iniziare da una pagina successiva con un numero personalizzato',
      async () => {
        const source =
          await createPdf();

        const result =
          await engine.addPageNumbers(
            source,
            {
              firstPage: 2,
              startNumber: 5,
              position: 'bottom-right',
            },
          );

        const output =
          await PDFDocument.load(result);

        expect(
          output.getPageCount(),
        ).toBe(3);

        expect(
          result.byteLength,
        ).toBeGreaterThan(
          source.byteLength,
        );
      },
    );

    it(
      'rifiuta una prima pagina fuori intervallo',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addPageNumbers(
            source,
            {
              firstPage: 4,
            },
          ),
        ).rejects.toThrow(
          'La prima pagina da numerare non è valida.',
        );
      },
    );

    it(
      'rifiuta un numero iniziale minore di 1',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addPageNumbers(
            source,
            {
              startNumber: 0,
            },
          ),
        ).rejects.toThrow(
          'Il numero iniziale deve essere almeno 1.',
        );
      },
    );

    it(
      'rifiuta dimensioni del testo non valide',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addPageNumbers(
            source,
            {
              fontSize: 4,
            },
          ),
        ).rejects.toThrow(
          /dimensione del numero/,
        );
      },
    );

    it(
      'rifiuta un PDF vuoto',
      async () => {
        await expect(
          engine.addPageNumbers(
            new Uint8Array(),
          ),
        ).rejects.toThrow(
          'Il PDF da numerare è vuoto.',
        );
      },
    );
  },
);