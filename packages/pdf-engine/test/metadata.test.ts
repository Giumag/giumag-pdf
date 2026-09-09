import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFStream,
} from 'pdf-lib';

import {
  BrowserPdfEngine,
} from '../src/index';

async function createPdfWithMetadata() {
  const doc =
    await PDFDocument.create({
      updateMetadata: false,
    });

  doc.addPage([300, 500]);
  doc.addPage([500, 300]);

  doc.setTitle(
    'Documento riservato',
  );

  doc.setAuthor(
    'Mario Rossi',
  );

  doc.setSubject(
    'Test metadata',
  );

  doc.setKeywords([
    'privato',
    'giumag',
  ]);

  doc.setCreator(
    'Giumag Test Creator',
  );

  doc.setProducer(
    'Giumag Test Producer',
  );

  doc.setCreationDate(
    new Date(
      '2024-01-02T03:04:05.000Z',
    ),
  );

  doc.setModificationDate(
    new Date(
      '2025-02-03T04:05:06.000Z',
    ),
  );

  const info =
    doc.context.lookup(
      doc.context.trailerInfo.Info,
    );

  if (!(info instanceof PDFDict)) {
    throw new Error(
      'Info dictionary non creato.',
    );
  }

  info.set(
    PDFName.of('Company'),
    PDFHexString.fromText(
      'Azienda privata',
    ),
  );

  const xmp =
    doc.context.stream(
      new TextEncoder().encode(
        [
          '<?xpacket begin="">',
          '<x:xmpmeta>',
          '<rdf:RDF>',
          '<rdf:Description>',
          '<dc:creator>private@example.com</dc:creator>',
          '</rdf:Description>',
          '</rdf:RDF>',
          '</x:xmpmeta>',
          '<?xpacket end="w"?>',
        ].join(''),
      ),
      {
        Type: 'Metadata',
        Subtype: 'XML',
      },
    );

  const xmpRef =
    doc.context.register(xmp);

  doc.catalog.set(
    PDFName.of('Metadata'),
    xmpRef,
  );

  doc.context.trailerInfo.ID =
    doc.context.obj([
      PDFHexString.fromText(
        'document-id-a',
      ),
      PDFHexString.fromText(
        'document-id-b',
      ),
    ]);

  return doc.save();
}

function countMetadataStreams(
  doc: PDFDocument,
) {
  let count = 0;

  for (
    const [, object]
    of doc.context.enumerateIndirectObjects()
  ) {
    if (
      object instanceof PDFStream &&
      object.dict
        .get(PDFName.of('Type'))
        ?.toString() ===
        '/Metadata'
    ) {
      count += 1;
    }
  }

  return count;
}

describe(
  'BrowserPdfEngine metadata',
  () => {
    const engine =
      new BrowserPdfEngine();

    it(
      'legge proprietà, XMP e identificatore del documento',
      async () => {
        const source =
          await createPdfWithMetadata();

        const metadata =
          await engine.inspectMetadata(
            source,
          );

        expect(
          metadata.title,
        ).toBe(
          'Documento riservato',
        );

        expect(
          metadata.author,
        ).toBe(
          'Mario Rossi',
        );

        expect(
          metadata.subject,
        ).toBe(
          'Test metadata',
        );

        expect(
          metadata.creator,
        ).toBe(
          'Giumag Test Creator',
        );

        expect(
          metadata.producer,
        ).toBe(
          'Giumag Test Producer',
        );

        expect(
          metadata.creationDate,
        ).toBe(
          '2024-01-02T03:04:05.000Z',
        );

        expect(
          metadata.modificationDate,
        ).toBe(
          '2025-02-03T04:05:06.000Z',
        );

        expect(
          metadata.infoFieldCount,
        ).toBeGreaterThanOrEqual(9);

        expect(
          metadata.xmpMetadataCount,
        ).toBe(1);

        expect(
          metadata.hasDocumentId,
        ).toBe(true);
      },
    );

    it(
      'rimuove Info, XMP e ID preservando le pagine',
      async () => {
        const source =
          await createPdfWithMetadata();

        const result =
          await engine.removeMetadata(
            source,
          );

        expect(
          result.byteLength,
        ).toBeGreaterThan(0);

        const output =
          await PDFDocument.load(
            result,
            {
              updateMetadata: false,
            },
          );

        expect(
          output.getPageCount(),
        ).toBe(2);

        expect(
          output.context.trailerInfo.Info,
        ).toBeUndefined();

        expect(
          output.context.trailerInfo.ID,
        ).toBeUndefined();

        expect(
          output.catalog.get(
            PDFName.of('Metadata'),
          ),
        ).toBeUndefined();

        expect(
          countMetadataStreams(
            output,
          ),
        ).toBe(0);
      },
    );

    it(
      'dopo la pulizia non rileva più metadati rimovibili',
      async () => {
        const source =
          await createPdfWithMetadata();

        const cleaned =
          await engine.removeMetadata(
            source,
          );

        const metadata =
          await engine.inspectMetadata(
            cleaned,
          );

        expect(
          metadata.infoFieldCount,
        ).toBe(0);

        expect(
          metadata.xmpMetadataCount,
        ).toBe(0);

        expect(
          metadata.hasDocumentId,
        ).toBe(false);
      },
    );

    it(
      'gestisce un PDF che non contiene metadati',
      async () => {
        const doc =
          await PDFDocument.create({
            updateMetadata: false,
          });

        doc.addPage();

        const source =
          await doc.save();

        const metadata =
          await engine.inspectMetadata(
            source,
          );

        expect(
          metadata.infoFieldCount,
        ).toBe(0);

        expect(
          metadata.xmpMetadataCount,
        ).toBe(0);

        expect(
          metadata.hasDocumentId,
        ).toBe(false);

        const result =
          await engine.removeMetadata(
            source,
          );

        const output =
          await PDFDocument.load(
            result,
            {
              updateMetadata: false,
            },
          );

        expect(
          output.getPageCount(),
        ).toBe(1);
      },
    );

    it(
      'rifiuta un PDF vuoto durante il controllo',
      async () => {
        await expect(
          engine.inspectMetadata(
            new Uint8Array(),
          ),
        ).rejects.toThrow(
          'Il PDF da controllare è vuoto.',
        );
      },
    );

    it(
      'rifiuta un PDF vuoto durante la pulizia',
      async () => {
        await expect(
          engine.removeMetadata(
            new Uint8Array(),
          ),
        ).rejects.toThrow(
          'Il PDF da pulire è vuoto.',
        );
      },
    );
  },
);