import { describe, expect, it } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';

import {
  BrowserPdfEngine,
  type Bytes,
  type PageRotation,
} from '../src/index';

interface SyntheticPage {
  width: number;
  height: number;
  rotation?: PageRotation;
}

async function createPdf(
  pages: SyntheticPage[],
): Promise<Bytes> {
  const doc = await PDFDocument.create();

  for (const definition of pages) {
    const page = doc.addPage([
      definition.width,
      definition.height,
    ]);

    if (definition.rotation) {
      page.setRotation(
        degrees(definition.rotation),
      );
    }
  }

  return doc.save();
}

async function readPdf(bytes: Bytes) {
  return PDFDocument.load(bytes);
}

function getWidths(doc: PDFDocument) {
  return doc.getPages().map(
    (page) => page.getWidth(),
  );
}

function getRotations(doc: PDFDocument) {
  return doc.getPages().map(
    (page) => page.getRotation().angle,
  );
}

describe('BrowserPdfEngine', () => {
  const engine = new BrowserPdfEngine();

  describe('merge', () => {
    it('unisce più PDF mantenendo ordine e numero delle pagine', async () => {
      const first = await createPdf([
        { width: 200, height: 300 },
        { width: 210, height: 310 },
      ]);

      const second = await createPdf([
        { width: 400, height: 500 },
      ]);

      const result = await engine.merge([
        first,
        second,
      ]);

      const output = await readPdf(result);

      expect(output.getPageCount()).toBe(3);
      expect(getWidths(output)).toEqual([
        200,
        210,
        400,
      ]);
    });
  });

  describe('rotate', () => {
    it('ruota soltanto le pagine selezionate preservando la rotazione esistente', async () => {
      const source = await createPdf([
        {
          width: 200,
          height: 300,
          rotation: 90,
        },
        {
          width: 300,
          height: 400,
        },
        {
          width: 400,
          height: 500,
          rotation: 180,
        },
      ]);

      const result = await engine.rotate(
        source,
        [0, 2],
        90,
      );

      const output = await readPdf(result);

      expect(getRotations(output)).toEqual([
        180,
        0,
        270,
      ]);
    });
  });

  describe('removePages', () => {
    it('rimuove le pagine richieste ignorando gli indici duplicati', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
        { width: 200, height: 300 },
        { width: 300, height: 400 },
        { width: 400, height: 500 },
      ]);

      const result = await engine.removePages(
        source,
        [1, 3, 1],
      );

      const output = await readPdf(result);

      expect(output.getPageCount()).toBe(2);
      expect(getWidths(output)).toEqual([
        100,
        300,
      ]);
    });

    it('rifiuta indici pagina da rimuovere non validi', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
        { width: 200, height: 300 },
      ]);

      await expect(
        engine.removePages(source, [-1]),
      ).rejects.toThrow(
        'Indice pagina da rimuovere non valido: -1',
      );

      await expect(
        engine.removePages(source, [2]),
      ).rejects.toThrow(
        'Indice pagina da rimuovere non valido: 2',
      );
    });

    it('impedisce di rimuovere tutte le pagine del PDF', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
        { width: 200, height: 300 },
      ]);

      await expect(
        engine.removePages(source, [0, 1]),
      ).rejects.toThrow(
        'Un PDF deve contenere almeno una pagina.',
      );
    });
  });

  describe('organize', () => {
    it('riordina, duplica e ruota le pagine secondo PageTransform', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
        { width: 200, height: 300 },
        { width: 300, height: 400 },
      ]);

      const result = await engine.organize(
        source,
        [
          {
            sourceIndex: 2,
            rotation: 90,
          },
          {
            sourceIndex: 0,
            rotation: 180,
          },
          {
            sourceIndex: 2,
            rotation: 270,
          },
        ],
      );

      const output = await readPdf(result);

      expect(output.getPageCount()).toBe(3);

      expect(getWidths(output)).toEqual([
        300,
        100,
        300,
      ]);

      expect(getRotations(output)).toEqual([
        90,
        180,
        270,
      ]);
    });

    it('rifiuta un output senza pagine', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
      ]);

      await expect(
        engine.organize(source, []),
      ).rejects.toThrow(
        'Un PDF deve contenere almeno una pagina.',
      );
    });

    it('rifiuta un indice pagina sorgente fuori intervallo', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
      ]);

      await expect(
        engine.organize(
          source,
          [
            {
              sourceIndex: 5,
              rotation: 0,
            },
          ],
        ),
      ).rejects.toThrow(
        'Indice pagina sorgente non valido: 5',
      );
    });
  });

  describe('extract', () => {
    it('estrae le pagine richieste mantenendo ordine e trasformazioni', async () => {
      const source = await createPdf([
        { width: 100, height: 200 },
        { width: 200, height: 300 },
        { width: 300, height: 400 },
      ]);

      const result = await engine.extract(
        source,
        [
          {
            sourceIndex: 2,
            rotation: 0,
          },
          {
            sourceIndex: 0,
            rotation: 90,
          },
        ],
      );

      const output = await readPdf(result);

      expect(output.getPageCount()).toBe(2);

      expect(getWidths(output)).toEqual([
        300,
        100,
      ]);

      expect(getRotations(output)).toEqual([
        0,
        90,
      ]);
    });
  });

  describe('crop', () => {
    it('imposta il CropBox soltanto sulle pagine richieste', async () => {
      const source = await createPdf([
        { width: 200, height: 300 },
        { width: 500, height: 600 },
      ]);

      const result = await engine.crop(
        source,
        [
          {
            pageIndex: 1,
            x: 20,
            y: 30,
            width: 300,
            height: 400,
          },
        ],
      );

      const output = await readPdf(result);

      expect(
        output.getPage(0).getCropBox(),
      ).toEqual({
        x: 0,
        y: 0,
        width: 200,
        height: 300,
      });

      expect(
        output.getPage(1).getCropBox(),
      ).toEqual({
        x: 20,
        y: 30,
        width: 300,
        height: 400,
      });
    });

    it('rifiuta un indice pagina non valido', async () => {
      const source = await createPdf([
        { width: 200, height: 300 },
      ]);

      await expect(
        engine.crop(
          source,
          [
            {
              pageIndex: 3,
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
          ],
        ),
      ).rejects.toThrow(
        'Indice pagina da ritagliare non valido: 3',
      );
    });

    it('rifiuta dimensioni di ritaglio nulle o negative', async () => {
      const source = await createPdf([
        { width: 200, height: 300 },
      ]);

      await expect(
        engine.crop(
          source,
          [
            {
              pageIndex: 0,
              x: 0,
              y: 0,
              width: 0,
              height: 100,
            },
          ],
        ),
      ).rejects.toThrow(
        /larghezza e altezza maggiori di zero/,
      );
    });

    it('rifiuta coordinate non finite', async () => {
      const source = await createPdf([
        { width: 200, height: 300 },
      ]);

      await expect(
        engine.crop(
          source,
          [
            {
              pageIndex: 0,
              x: Number.NaN,
              y: 0,
              width: 100,
              height: 100,
            },
          ],
        ),
      ).rejects.toThrow(
        'Coordinate di ritaglio non valide.',
      );
    });
  });
});