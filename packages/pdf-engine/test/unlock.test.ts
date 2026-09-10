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

async function createPdf() {
  const document =
    await PDFDocument.create();

  document.addPage([
    320,
    480,
  ]);

  document.addPage([
    480,
    320,
  ]);

  return document.save();
}

describe(
  'Sblocca PDF',
  () => {
    it(
      'rimuove la cifratura e preserva le pagine',
      async () => {
        const engine =
          new BrowserPdfEngine();

        const source =
          await createPdf();

        const protectedPdf =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
            },
          );

        const unlocked =
          await engine.unlock(
            protectedPdf,
            'Password-123!',
          );

        const info =
          await engine.inspectProtection(
            unlocked,
          );

        expect(
          info.encrypted,
        ).toBe(false);

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
      'rifiuta una password errata',
      async () => {
        const engine =
          new BrowserPdfEngine();

        const source =
          await createPdf();

        const protectedPdf =
          await engine.protect(
            source,
            {
              password:
                'Password-123!',
            },
          );

        await expect(
          engine.unlock(
            protectedPdf,
            'Password-sbagliata!',
          ),
        ).rejects.toThrow(
          'Password non corretta',
        );
      },
    );

    it(
      'segnala un PDF non cifrato',
      async () => {
        const engine =
          new BrowserPdfEngine();

        const source =
          await createPdf();

        await expect(
          engine.unlock(
            source,
          ),
        ).rejects.toThrow(
          'non è protetto',
        );
      },
    );
  },
);
