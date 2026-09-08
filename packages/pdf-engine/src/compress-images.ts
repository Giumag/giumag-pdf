import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
} from 'pdf-lib';

export type ImageCompressionPreset =
  | 'recommended'
  | 'strong';

interface ImageCompressionProfile {
  maxSide: number;
  quality: number;
}

const PROFILES: Record<
  ImageCompressionPreset,
  ImageCompressionProfile
> = {
  recommended: {
    maxSide: 1800,
    quality: 78,
  },
  strong: {
    maxSide: 1200,
    quality: 58,
  },
};

function isJpegImageStream(
  stream: PDFRawStream,
): boolean {
  const dict = stream.dict;

  const subtype =
    dict.get(PDFName.of('Subtype'));

  if (subtype?.toString() !== '/Image') {
    return false;
  }

  const filter =
    dict.get(PDFName.of('Filter'));

  if (filter?.toString() !== '/DCTDecode') {
    return false;
  }

  /*
   * Ridimensionare una Image XObject con mask separata
   * richiederebbe ridimensionare anche la mask.
   * Finché non gestiamo quel caso esplicitamente,
   * la scelta sicura è non modificare l'immagine.
   */
  if (
    dict.has(PDFName.of('SMask')) ||
    dict.has(PDFName.of('Mask')) ||
    dict.has(PDFName.of('ImageMask'))
  ) {
    return false;
  }

  return true;
}

function copyArrayBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const copy =
    new Uint8Array(bytes.byteLength);

  copy.set(bytes);

  return copy.buffer;
}

export async function recompressEmbeddedJpegs(
  file: Uint8Array,
  preset: ImageCompressionPreset,
): Promise<Uint8Array> {
  const profile = PROFILES[preset];

  const doc = await PDFDocument.load(
    file,
    {
      updateMetadata: false,
    },
  );

  const targets = doc.context
    .enumerateIndirectObjects()
    .filter(
      (
        entry,
      ): entry is [
        typeof entry[0],
        PDFRawStream,
      ] => (
        entry[1] instanceof PDFRawStream &&
        isJpegImageStream(entry[1])
      ),
    );

  /*
   * Importiamo i WASM solo se il PDF contiene
   * effettivamente JPEG compatibili.
   *
   * Questo mantiene i PDF testuali/vettoriali
   * sul percorso leggero.
   */
  if (targets.length === 0) {
    return file;
  }

  const [
    jpegModule,
    resizeModule,
  ] = await Promise.all([
    import('@jsquash/jpeg'),
    import('@jsquash/resize'),
  ]);

  const {
    decode,
    encode,
  } = jpegModule;

  const resize = resizeModule.default;

  let changed = false;

  for (const [ref, stream] of targets) {
    try {
      const original =
        new Uint8Array(
          stream.contents.byteLength,
        );

      original.set(stream.contents);

      let imageData = await decode(
        copyArrayBuffer(original),
      );

      const longestSide =
        Math.max(
          imageData.width,
          imageData.height,
        );

      if (longestSide > profile.maxSide) {
        const scale =
          profile.maxSide /
          longestSide;

        const width =
          Math.max(
            1,
            Math.round(
              imageData.width * scale,
            ),
          );

        const height =
          Math.max(
            1,
            Math.round(
              imageData.height * scale,
            ),
          );

        imageData = await resize(
          imageData,
          {
            width,
            height,
            method: 'lanczos3',
          },
        );
      }

      const encodedBuffer =
        await encode(
          imageData,
          {
            quality: profile.quality,
          },
        );

      const encoded =
        new Uint8Array(encodedBuffer);

      /*
       * Non sostituiamo l'immagine se il guadagno
       * è trascurabile o inesistente.
       *
       * Oltre a evitare lavoro inutile, questo impedisce
       * di peggiorare PDF già ben ottimizzati.
       */
      const minimumUsefulSaving =
        Math.max(
          256,
          Math.round(
            original.byteLength * 0.005,
          ),
        );

      if (
        encoded.byteLength >=
        original.byteLength -
          minimumUsefulSaving
      ) {
        continue;
      }

      const dict = stream.dict;

      /*
       * Il nuovo stream è un JPEG RGB 8 bit:
       * la dictionary PDF deve descrivere
       * esattamente i nuovi dati.
       */
      dict.set(
        PDFName.of('Filter'),
        PDFName.of('DCTDecode'),
      );

      dict.set(
        PDFName.of('ColorSpace'),
        PDFName.of('DeviceRGB'),
      );

      dict.set(
        PDFName.of('BitsPerComponent'),
        PDFNumber.of(8),
      );

      dict.set(
        PDFName.of('Width'),
        PDFNumber.of(imageData.width),
      );

      dict.set(
        PDFName.of('Height'),
        PDFNumber.of(imageData.height),
      );

      dict.set(
        PDFName.of('Length'),
        PDFNumber.of(encoded.byteLength),
      );

      /*
       * Questi parametri appartenevano al vecchio
       * encoding e non devono sopravvivere.
       */
      dict.delete(
        PDFName.of('DecodeParms'),
      );

      dict.delete(
        PDFName.of('Decode'),
      );

      doc.context.assign(
        ref,
        PDFRawStream.of(
          dict,
          encoded,
        ),
      );

      changed = true;
    } catch {
      /*
       * Un'immagine problematica non deve mai
       * compromettere l'intero PDF.
       */
      continue;
    }
  }

  if (!changed) {
    return file;
  }

  return doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
}