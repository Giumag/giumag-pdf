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
  'BrowserPdfEngine addTextWatermark',
  () => {
    const engine =
      new BrowserPdfEngine();

    it(
      'aggiunge una filigrana mantenendo pagine e rotazioni',
      async () => {
        const source =
          await createPdf();

        const result =
          await engine.addTextWatermark(
            source,
            {
              text: 'RISERVATO',
            },
          );

        expect(
          result.byteLength,
        ).toBeGreaterThan(
          source.byteLength,
        );

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
      'supporta posizione e intervallo di pagine personalizzati',
      async () => {
        const source =
          await createPdf();

        const result =
          await engine.addTextWatermark(
            source,
            {
              text: 'BOZZA',
              position: 'bottom-right',
              firstPage: 2,
              lastPage: 3,
              fontSize: 32,
              opacity: 0.25,
              rotation: 0,
              margin: 20,
            },
          );

        const output =
          await PDFDocument.load(result);

        expect(
          output.getPageCount(),
        ).toBe(3);

        expect(
          result.byteLength,
        ).toBeGreaterThan(0);
      },
    );

    it(
      'rifiuta un testo vuoto',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addTextWatermark(
            source,
            {
              text: '   ',
            },
          ),
        ).rejects.toThrow(
          'Scrivi il testo della filigrana.',
        );
      },
    );

    it(
      'rifiuta intervalli pagina non validi',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addTextWatermark(
            source,
            {
              text: 'TEST',
              firstPage: 3,
              lastPage: 2,
            },
          ),
        ).rejects.toThrow(
          /prima pagina/,
        );
      },
    );

    it(
      'rifiuta opacità fuori intervallo',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addTextWatermark(
            source,
            {
              text: 'TEST',
              opacity: 1.5,
            },
          ),
        ).rejects.toThrow(
          /opacità/,
        );
      },
    );

    it(
      'rifiuta dimensioni non valide',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.addTextWatermark(
            source,
            {
              text: 'TEST',
              fontSize: 8,
            },
          ),
        ).rejects.toThrow(
          /dimensione/,
        );
      },
    );

    it(
      'rifiuta un PDF vuoto',
      async () => {
        await expect(
          engine.addTextWatermark(
            new Uint8Array(),
            {
              text: 'TEST',
            },
          ),
        ).rejects.toThrow(
          'Il PDF da filigranare è vuoto.',
        );
      },
    );
  },
);