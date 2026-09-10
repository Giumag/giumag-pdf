import {
  PDFDocument,
  PDFRawStream,
  arrayAsString,
  decodePDFRawStream,
} from 'pdf-lib';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  BrowserPdfEngine,
} from '../src/index';

const ONE_PIXEL_PNG =
  new Uint8Array([
    137, 80, 78, 71,
    13, 10, 26, 10,
    0, 0, 0, 13,
    73, 72, 68, 82,
    0, 0, 0, 1,
    0, 0, 0, 1,
    8, 4, 0, 0,
    0, 181, 28, 12,
    2, 0, 0, 0,
    11, 73, 68, 65,
    84, 120, 218, 99,
    100, 248, 15, 0,
    1, 5, 1, 1,
    39, 24, 227, 102,
    0, 0, 0, 0,
    73, 69, 78, 68,
    174, 66, 96, 130,
  ]);

function decodedStreams(
  document: PDFDocument,
) {
  let result = '';

  for (
    const [, object]
    of document.context
      .enumerateIndirectObjects()
  ) {
    if (
      !(
        object instanceof
        PDFRawStream
      )
    ) {
      continue;
    }

    try {
      result +=
        arrayAsString(
          decodePDFRawStream(
            object,
          ).decode(),
        );
    } catch {
      // Non tutti gli stream sono testuali.
    }
  }

  return result;
}

describe(
  'OCR searchable PDF',
  () => {
    it(
      'crea un PDF con immagine e livello testuale',
      async () => {
        const engine =
          new BrowserPdfEngine();

        const bytes =
          await engine
            .createSearchablePdf([
              {
                image: {
                  bytes:
                    ONE_PIXEL_PNG,
                  format:
                    'png',
                },
                pixelWidth:
                  1000,
                pixelHeight:
                  1400,
                pageWidth:
                  500,
                pageHeight:
                  700,
                lines: [
                  {
                    text:
                      'Testo ricercabile',
                    x0: 100,
                    y0: 100,
                    x1: 800,
                    y1: 180,
                    confidence: 95,
                  },
                ],
              },
            ]);

        expect(
          bytes.byteLength,
        ).toBeGreaterThan(
          ONE_PIXEL_PNG
            .byteLength,
        );

        const document =
          await PDFDocument.load(
            bytes,
          );

        expect(
          document.getPageCount(),
        ).toBe(1);

        const page =
          document.getPage(0);

        expect(
          page.getWidth(),
        ).toBeCloseTo(
          500,
        );

        expect(
          page.getHeight(),
        ).toBeCloseTo(
          700,
        );

        const streams =
          decodedStreams(
            document,
          ).toUpperCase();

        /*
         * "Testo ricercabile" codificato
         * in WinAnsi/ASCII esadecimale.
         */
        expect(
          streams,
        ).toContain(
          '546573746F207269636572636162696C65'
            .toUpperCase(),
        );
      },
    );

    it(
      'rifiuta una lista di pagine vuota',
      async () => {
        const engine =
          new BrowserPdfEngine();

        await expect(
          engine
            .createSearchablePdf(
              [],
            ),
        ).rejects.toThrow(
          'Nessuna pagina OCR',
        );
      },
    );
  },
);