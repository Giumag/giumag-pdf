import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import {
  applyVisualSignature,
} from '../src/visual-signature';

const onePixelPng = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1,
  8, 4, 0, 0, 0, 181, 28, 12,
  2, 0, 0, 0, 11, 73, 68, 65,
  84, 120, 218, 99, 252, 255, 31, 0,
  2, 235, 1, 245, 105, 119, 187, 203,
  0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

describe('applyVisualSignature', () => {
  it('inserisce una firma visiva mantenendo il PDF valido', async () => {
    const source = await PDFDocument.create();

    source.addPage([595, 842]);

    const sourceBytes = await source.save();

    const result = await applyVisualSignature({
      pdfBytes: sourceBytes,
      signatureBytes: onePixelPng,
      mimeType: 'image/png',
      placements: [
        {
          pageIndex: 0,
          x: 0.55,
          y: 0.72,
          width: 0.28,
          height: 0.08,
        },
      ],
    });

    expect(result.byteLength).toBeGreaterThan(0);

    const reopened = await PDFDocument.load(result);

    expect(reopened.getPageCount()).toBe(1);
  });

  it('rifiuta una firma fuori dalla pagina', async () => {
    const source = await PDFDocument.create();

    source.addPage([595, 842]);

    const sourceBytes = await source.save();

    await expect(
      applyVisualSignature({
        pdfBytes: sourceBytes,
        signatureBytes: onePixelPng,
        mimeType: 'image/png',
        placements: [
          {
            pageIndex: 0,
            x: 0.9,
            y: 0.5,
            width: 0.2,
            height: 0.1,
          },
        ],
      }),
    ).rejects.toThrow(
      'entro i limiti della pagina',
    );
  });
});