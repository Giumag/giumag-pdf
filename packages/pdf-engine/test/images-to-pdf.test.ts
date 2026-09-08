import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PDFDocument,
} from 'pdf-lib';

import {
  BrowserPdfEngine,
} from '../src/index';

function decodeBase64(
  value: string,
) {
  return Uint8Array.from(
    Buffer.from(
      value,
      'base64',
    ),
  );
}

function createPngBytes() {
  return decodeBase64(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  );
}

function createJpegBytes() {
  return decodeBase64(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKAP/2Q==',
  );
}

describe(
  'BrowserPdfEngine imagesToPdf',
  () => {
    const engine =
      new BrowserPdfEngine();

    it(
      'crea una pagina per ogni immagine',
      async () => {
        const result =
          await engine.imagesToPdf([
            {
              bytes: createJpegBytes(),
              format: 'jpeg',
            },
            {
              bytes: createPngBytes(),
              format: 'png',
            },
          ]);

        const pdf =
          await PDFDocument.load(result);

        expect(
          pdf.getPageCount(),
        ).toBe(2);
      },
    );

    it(
      'crea pagine A4 landscape',
      async () => {
        const result =
          await engine.imagesToPdf(
            [
              {
                bytes: createPngBytes(),
                format: 'png',
              },
            ],
            {
              pageSize: 'a4',
              orientation: 'landscape',
              margin: 20,
            },
          );

        const pdf =
          await PDFDocument.load(result);

        const page =
          pdf.getPage(0);

        expect(
          page.getWidth(),
        ).toBeCloseTo(
          841.89,
          1,
        );

        expect(
          page.getHeight(),
        ).toBeCloseTo(
          595.28,
          1,
        );
      },
    );

    it(
      'supporta la rotazione',
      async () => {
        const result =
          await engine.imagesToPdf(
            [
              {
                bytes: createJpegBytes(),
                format: 'jpeg',
                rotation: 90,
              },
            ],
            {
              pageSize: 'letter',
              orientation: 'portrait',
              margin: 24,
            },
          );

        const pdf =
          await PDFDocument.load(result);

        expect(
          pdf.getPageCount(),
        ).toBe(1);

        expect(
          pdf.getPage(0).getWidth(),
        ).toBe(612);

        expect(
          pdf.getPage(0).getHeight(),
        ).toBe(792);
      },
    );

    it(
      'rifiuta una lista vuota',
      async () => {
        await expect(
          engine.imagesToPdf([]),
        ).rejects.toThrow(
          'Aggiungi almeno un’immagine.',
        );
      },
    );

    it(
      'rifiuta margini troppo grandi',
      async () => {
        await expect(
          engine.imagesToPdf(
            [
              {
                bytes: createPngBytes(),
                format: 'png',
              },
            ],
            {
              pageSize: 'a4',
              margin: 1000,
            },
          ),
        ).rejects.toThrow(
          'Il margine è troppo grande',
        );
      },
    );
  },
);