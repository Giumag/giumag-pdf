import type {
  PageRotation,
  PdfImageFormat,
} from '@giumag/pdf-engine';

export interface PreparedPdfImage {
  id: string;
  name: string;
  bytes: Uint8Array;
  format: PdfImageFormat;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  rotation: PageRotation;
}

const ACCEPTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

export function acceptsImageFile(
  file: File,
) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return (
    type === 'image/jpeg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    ACCEPTED_EXTENSIONS.some(
      (extension) => name.endsWith(extension),
    )
  );
}

function createId() {
  if (
    typeof crypto !== 'undefined' &&
    'randomUUID' in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join('-');
}

function readUint16(
  view: DataView,
  offset: number,
  littleEndian: boolean,
) {
  return view.getUint16(
    offset,
    littleEndian,
  );
}

function readUint32(
  view: DataView,
  offset: number,
  littleEndian: boolean,
) {
  return view.getUint32(
    offset,
    littleEndian,
  );
}

/*
 * Legge solo il tag Orientation dall'IFD0 EXIF.
 * Non modifica il file.
 */
function readJpegExifOrientation(
  bytes: Uint8Array,
): number | null {
  if (
    bytes.byteLength < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8
  ) {
    return null;
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );

  let offset = 2;

  while (offset + 4 <= bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      break;
    }

    const marker = bytes[offset + 1];

    if (
      marker === 0xda ||
      marker === 0xd9
    ) {
      break;
    }

    const length = view.getUint16(
      offset + 2,
      false,
    );

    if (
      length < 2 ||
      offset + 2 + length >
        bytes.byteLength
    ) {
      break;
    }

    if (
      marker === 0xe1 &&
      length >= 10
    ) {
      const exifOffset = offset + 4;

      const isExif =
        bytes[exifOffset] === 0x45 &&
        bytes[exifOffset + 1] === 0x78 &&
        bytes[exifOffset + 2] === 0x69 &&
        bytes[exifOffset + 3] === 0x66 &&
        bytes[exifOffset + 4] === 0 &&
        bytes[exifOffset + 5] === 0;

      if (isExif) {
        const tiffOffset =
          exifOffset + 6;

        if (
          tiffOffset + 8 >
          bytes.byteLength
        ) {
          return null;
        }

        const byteOrder =
          view.getUint16(
            tiffOffset,
            false,
          );

        const littleEndian =
          byteOrder === 0x4949;

        if (
          !littleEndian &&
          byteOrder !== 0x4d4d
        ) {
          return null;
        }

        const ifdRelative =
          readUint32(
            view,
            tiffOffset + 4,
            littleEndian,
          );

        const ifdOffset =
          tiffOffset + ifdRelative;

        if (
          ifdOffset + 2 >
          bytes.byteLength
        ) {
          return null;
        }

        const entryCount =
          readUint16(
            view,
            ifdOffset,
            littleEndian,
          );

        for (
          let index = 0;
          index < entryCount;
          index += 1
        ) {
          const entryOffset =
            ifdOffset +
            2 +
            index * 12;

          if (
            entryOffset + 12 >
            bytes.byteLength
          ) {
            break;
          }

          const tag =
            readUint16(
              view,
              entryOffset,
              littleEndian,
            );

          if (tag !== 0x0112) {
            continue;
          }

          const type =
            readUint16(
              view,
              entryOffset + 2,
              littleEndian,
            );

          const count =
            readUint32(
              view,
              entryOffset + 4,
              littleEndian,
            );

          if (
            type === 3 &&
            count >= 1
          ) {
            return readUint16(
              view,
              entryOffset + 8,
              littleEndian,
            );
          }

          return null;
        }
      }
    }

    offset += 2 + length;
  }

  return null;
}

async function loadBitmap(
  file: Blob,
) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(
      file,
      {
        imageOrientation: 'from-image',
      },
    );
  }

  throw new Error(
    'Questo browser non supporta la decodifica immagini richiesta.',
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob>(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                'Impossibile normalizzare questa immagine.',
              ),
            );

            return;
          }

          resolve(blob);
        },
        type,
        quality,
      );
    },
  );
}

async function normalizeBlob(
  file: File,
  outputType:
    | 'image/jpeg'
    | 'image/png',
) {
  const bitmap =
    await loadBitmap(file);

  try {
    const canvas =
      document.createElement('canvas');

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context =
      canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Impossibile inizializzare il canvas.',
      );
    }

    if (outputType === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    context.drawImage(
      bitmap,
      0,
      0,
    );

    const blob =
      await canvasToBlob(
        canvas,
        outputType,
        outputType === 'image/jpeg'
          ? 0.96
          : undefined,
      );

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}

async function readDimensions(
  file: Blob,
) {
  const bitmap =
    await loadBitmap(file);

  try {
    return {
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

function detectedType(
  file: File,
) {
  const type =
    file.type.toLowerCase();

  const name =
    file.name.toLowerCase();

  if (
    type === 'image/png' ||
    name.endsWith('.png')
  ) {
    return 'png';
  }

  if (
    type === 'image/webp' ||
    name.endsWith('.webp')
  ) {
    return 'webp';
  }

  return 'jpeg';
}

export async function prepareImageFile(
  file: File,
): Promise<PreparedPdfImage> {
  if (!acceptsImageFile(file)) {
    throw new Error(
      `${file.name}: formato non supportato.`,
    );
  }

  const type =
    detectedType(file);

  const original =
    new Uint8Array(
      await file.arrayBuffer(),
    );

  /*
   * PNG: può essere incorporato direttamente.
   */
  if (type === 'png') {
    const dimensions =
      await readDimensions(file);

    return {
      id: createId(),
      name: file.name,
      bytes: original,
      format: 'png',
      previewUrl:
        URL.createObjectURL(file),
      width: dimensions.width,
      height: dimensions.height,
      originalSize: file.size,
      rotation: 0,
    };
  }

  /*
   * JPEG senza orientamento EXIF particolare:
   * manteniamo i byte originali e quindi non
   * introduciamo alcuna ricompressione.
   */
  if (type === 'jpeg') {
    const orientation =
      readJpegExifOrientation(
        original,
      );

    if (
      orientation === null ||
      orientation === 1
    ) {
      const dimensions =
        await readDimensions(file);

      return {
        id: createId(),
        name: file.name,
        bytes: original,
        format: 'jpeg',
        previewUrl:
          URL.createObjectURL(file),
        width: dimensions.width,
        height: dimensions.height,
        originalSize: file.size,
        rotation: 0,
      };
    }

    /*
     * Per orientamenti EXIF ruotati o specchiati
     * lasciamo al decoder del browser l'applicazione
     * esatta della trasformazione, quindi salviamo
     * un JPEG già normalizzato.
     */
    const normalized =
      await normalizeBlob(
        file,
        'image/jpeg',
      );

    return {
      id: createId(),
      name: file.name,
      bytes:
        new Uint8Array(
          await normalized.blob.arrayBuffer(),
        ),
      format: 'jpeg',
      previewUrl:
        URL.createObjectURL(
          normalized.blob,
        ),
      width: normalized.width,
      height: normalized.height,
      originalSize: file.size,
      rotation: 0,
    };
  }

  /*
   * pdf-lib non incorpora WebP direttamente.
   * Lo convertiamo in PNG per preservare anche
   * l'eventuale trasparenza.
   */
  const normalized =
    await normalizeBlob(
      file,
      'image/png',
    );

  return {
    id: createId(),
    name: file.name,
    bytes:
      new Uint8Array(
        await normalized.blob.arrayBuffer(),
      ),
    format: 'png',
    previewUrl:
      URL.createObjectURL(
        normalized.blob,
      ),
    width: normalized.width,
    height: normalized.height,
    originalSize: file.size,
    rotation: 0,
  };
}

export function disposePreparedImage(
  image: PreparedPdfImage,
) {
  URL.revokeObjectURL(
    image.previewUrl,
  );
}