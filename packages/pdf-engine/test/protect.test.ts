import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PDFDocument,
} from 'pdf-lib';

import {
  createPdfToolkit,
} from 'pdfstudio';

import {
  BrowserPdfEngine,
} from '../src/index';

async function createPdf() {
  const doc =
    await PDFDocument.create();

  doc.addPage([300, 500]);
  doc.addPage([500, 300]);

  return doc.save();
}

describe(
  'BrowserPdfEngine protect',
  () => {
    const engine =
      new BrowserPdfEngine();

    it(
      'crea un PDF AES-256 protetto da password',
      async () => {
        const source =
          await createPdf();

        const output =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
            },
          );

        const info =
          await engine.inspectProtection(
            output,
            'Password-123!',
          );

        expect(
          info.encrypted,
        ).toBe(true);

        expect(
          info.requiresPassword,
        ).toBe(true);

        expect(
          info.bits,
        ).toBe(256);

        expect(
          info.method
            ?.toUpperCase(),
        ).toContain('AES');

        expect(
          info.userPasswordMatched,
        ).toBe(true);

        expect(
          info.ownerPasswordMatched,
        ).toBe(false);
      },
    );

    it(
      'preserva tutte le pagine',
      async () => {
        const source =
          await createPdf();

        const output =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
            },
          );

        const toolkit =
          await createPdfToolkit();

        const unlocked =
          await toolkit.unlock(
            output,
            {
              password:
                'Password-123!',
            },
          );

        const document =
          await PDFDocument.load(
            unlocked,
          );

        expect(
          document.getPageCount(),
        ).toBe(2);
      },
    );

    it(
      'applica restrizioni a stampa modifica e copia',
      async () => {
        const source =
          await createPdf();

        const output =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
              permissions: {
                print: false,
                modify: false,
                extract: false,
              },
            },
          );

        const info =
          await engine.inspectProtection(
            output,
            'Password-123!',
          );

        expect(
          info.permissions,
        ).toEqual({
          print: false,
          modify: false,
          extract: false,
        });
      },
    );

    it(
      'consente i permessi per default',
      async () => {
        const source =
          await createPdf();

        const output =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
            },
          );

        const info =
          await engine.inspectProtection(
            output,
            'Password-123!',
          );

        expect(
          info.permissions,
        ).toEqual({
          print: true,
          modify: true,
          extract: true,
        });
      },
    );

    it(
      'rifiuta password troppo corte',
      async () => {
        const source =
          await createPdf();

        await expect(
          engine.protect(
            source,
            {
              password: 'abc',
            },
          ),
        ).rejects.toThrow(
          /almeno 8 caratteri/,
        );
      },
    );

    it(
      'rifiuta un PDF già cifrato',
      async () => {
        const source =
          await createPdf();

        const output =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
            },
          );

        await expect(
          engine.protect(
            output,
            {
              password:
                'AltraPassword-123!',
            },
          ),
        ).rejects.toThrow(
          /già protetto/,
        );
      },
    );

    it(
      'rifiuta input vuoti',
      async () => {
        await expect(
          engine.protect(
            new Uint8Array(),
            {
              password:
                'Password-123!',
            },
          ),
        ).rejects.toThrow(
          'Il PDF da proteggere è vuoto.',
        );

        await expect(
          engine.inspectProtection(
            new Uint8Array(),
          ),
        ).rejects.toThrow(
          'Il PDF da controllare è vuoto.',
        );
      },
    );
  },
);