import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import {
  BrowserPdfEngine,
  type CompressionPreset,
} from '../src/index';

async function createSyntheticPdf() {
  const doc = await PDFDocument.create();

  doc.addPage([320, 480]);
  doc.addPage([480, 320]);

  return doc.save();
}

describe('BrowserPdfEngine compression', () => {
  const engine = new BrowserPdfEngine();

  const presets: CompressionPreset[] = [
    'light',
    'recommended',
    'strong',
  ];

  it.each(presets)(
    'produce un PDF valido con preset %s',
    async (preset) => {
      const source = await createSyntheticPdf();
      const result = await engine.compress(
        source,
        preset,
      );

      expect(result.byteLength).toBeGreaterThan(0);

      const output = await PDFDocument.load(result);

      expect(output.getPageCount()).toBe(2);
    },
  );

  it('rifiuta un PDF vuoto', async () => {
    await expect(
      engine.compress(
        new Uint8Array(),
        'light',
      ),
    ).rejects.toThrow(
      'Il PDF da comprimere è vuoto.',
    );
  });
});
