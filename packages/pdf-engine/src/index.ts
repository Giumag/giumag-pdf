import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFStream,
  PDFString,
  StandardFonts,
  degrees,
  rgb,
} from 'pdf-lib';

export type Bytes = Uint8Array;
export type PageRotation = 0 | 90 | 180 | 270;
export type CompressionPreset =
  | 'light'
  | 'recommended'
  | 'strong';
export type PdfImageFormat =
  | 'jpeg'
  | 'png';

export type ImagesPdfPageSize =
  | 'auto'
  | 'a4'
  | 'letter';

export type ImagesPdfOrientation =
  | 'auto'
  | 'portrait'
  | 'landscape';

export type ImagesPdfFit =
  | 'contain'
  | 'cover';

export interface PdfImageSource {
  bytes: Bytes;
  format: PdfImageFormat;
  rotation?: PageRotation;
}

export interface ImagesToPdfOptions {
  pageSize?: ImagesPdfPageSize;
  orientation?: ImagesPdfOrientation;
  margin?: number;
  fit?: ImagesPdfFit;
}

export interface OcrPdfTextLine {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence?: number;
}

export interface OcrPdfPage {
  image: PdfImageSource;
  pixelWidth: number;
  pixelHeight: number;
  pageWidth: number;
  pageHeight: number;
  lines: OcrPdfTextLine[];
}
export interface ProtectPdfPermissions {
  print?: boolean;
  modify?: boolean;
  extract?: boolean;
}

export interface ProtectPdfOptions {
  password: string;
  permissions?: ProtectPdfPermissions;
}

export interface PdfProtectionPermissions {
  print: boolean;
  modify: boolean;
  extract: boolean;
}

export interface PdfProtectionInfo {
  encrypted: boolean;
  requiresPassword: boolean;
  bits?: number;
  method?: string;
  userPasswordMatched?: boolean;
  ownerPasswordMatched?: boolean;
  permissions?: PdfProtectionPermissions;
}

export interface PdfMetadataSummary {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  infoFieldCount: number;
  xmpMetadataCount: number;
  hasDocumentId: boolean;
}

export type PageNumberPosition =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PageNumberOptions {
  position?: PageNumberPosition;
  firstPage?: number;
  startNumber?: number;
  fontSize?: number;
  margin?: number;
}

export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface TextWatermarkOptions {
  text: string;
  position?: WatermarkPosition;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  margin?: number;
  firstPage?: number;
  lastPage?: number;
}

export interface PageTransform {
  sourceIndex: number;
  rotation: PageRotation;
}

export interface PageCrop {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfEngine {
  merge(files: Bytes[]): Promise<Bytes>;
  rotate(file: Bytes, pageIndexes: number[], clockwiseDegrees: 90 | 180 | 270): Promise<Bytes>;
  removePages(file: Bytes, pageIndexes: number[]): Promise<Bytes>;
  organize(file: Bytes, pages: PageTransform[]): Promise<Bytes>;
  extract(file: Bytes, pages: PageTransform[]): Promise<Bytes>;
  crop(file: Bytes, crops: PageCrop[]): Promise<Bytes>;
  inspectProtection(
    file: Bytes,
    password?: string,
  ): Promise<PdfProtectionInfo>;
  protect(
    file: Bytes,
    options: ProtectPdfOptions,
  ): Promise<Bytes>;
  unlock(
    file: Bytes,
    password?: string,
  ): Promise<Bytes>;
  compress(
    file: Bytes,
    preset?: CompressionPreset,
  ): Promise<Bytes>;
  inspectMetadata(
    file: Bytes,
  ): Promise<PdfMetadataSummary>;
  removeMetadata(
    file: Bytes,
  ): Promise<Bytes>;
  addTextWatermark(
    file: Bytes,
    options: TextWatermarkOptions,
  ): Promise<Bytes>;
  addPageNumbers(
    file: Bytes,
    options?: PageNumberOptions,
  ): Promise<Bytes>;
  createSearchablePdf(
    pages: OcrPdfPage[],
  ): Promise<Bytes>;
  imagesToPdf(
    images: PdfImageSource[],
    options?: ImagesToPdfOptions,
  ): Promise<Bytes>;
}

function validateTransforms(pageCount: number, pages: PageTransform[]) {
  if (pages.length === 0) {
    throw new Error('Un PDF deve contenere almeno una pagina.');
  }

  for (const page of pages) {
    if (
      !Number.isInteger(page.sourceIndex) ||
      page.sourceIndex < 0 ||
      page.sourceIndex >= pageCount
    ) {
      throw new Error(
        `Indice pagina sorgente non valido: ${page.sourceIndex}`,
      );
    }
  }
}

function validateCrop(pageCount: number, crop: PageCrop) {
  if (
    !Number.isInteger(crop.pageIndex) ||
    crop.pageIndex < 0 ||
    crop.pageIndex >= pageCount
  ) {
    throw new Error(
      `Indice pagina da ritagliare non valido: ${crop.pageIndex}`,
    );
  }

  if (
    !Number.isFinite(crop.x) ||
    !Number.isFinite(crop.y) ||
    !Number.isFinite(crop.width) ||
    !Number.isFinite(crop.height)
  ) {
    throw new Error('Coordinate di ritaglio non valide.');
  }

  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error(
      'L?area di ritaglio deve avere larghezza e altezza maggiori di zero.',
    );
  }
}

function metadataInfoDictionary(
  doc: PDFDocument,
): PDFDict | undefined {
  const info =
    doc.context.lookup(
      doc.context.trailerInfo.Info,
    );

  return info instanceof PDFDict
    ? info
    : undefined;
}

function metadataTextValue(
  info: PDFDict | undefined,
  key: string,
) {
  if (!info) {
    return undefined;
  }

  const value =
    info.lookup(
      PDFName.of(key),
    );

  if (
    !(value instanceof PDFString) &&
    !(value instanceof PDFHexString)
  ) {
    return undefined;
  }

  try {
    const text =
      value.decodeText().trim();

    return text || undefined;
  }
  catch {
    return undefined;
  }
}

function metadataDateValue(
  info: PDFDict | undefined,
  key: string,
) {
  if (!info) {
    return undefined;
  }

  const value =
    info.lookup(
      PDFName.of(key),
    );

  if (
    !(value instanceof PDFString) &&
    !(value instanceof PDFHexString)
  ) {
    return undefined;
  }

  try {
    return value
      .decodeDate()
      .toISOString();
  }
  catch {
    return undefined;
  }
}

function metadataDictionaryForObject(
  object: unknown,
): PDFDict | undefined {
  if (object instanceof PDFDict) {
    return object;
  }

  if (object instanceof PDFStream) {
    return object.dict;
  }

  return undefined;
}

function isMetadataStream(
  object: unknown,
) {
  if (!(object instanceof PDFStream)) {
    return false;
  }

  return (
    object.dict
      .get(PDFName.of('Type'))
      ?.toString() ===
    '/Metadata'
  );
}

function xmpMetadataReferences(
  doc: PDFDocument,
) {
  const references =
    new Map<string, PDFRef>();

  let directCount = 0;

  const metadataKey =
    PDFName.of('Metadata');

  for (
    const [ref, object]
    of doc.context.enumerateIndirectObjects()
  ) {
    if (isMetadataStream(object)) {
      references.set(
        ref.toString(),
        ref,
      );
    }

    const dict =
      metadataDictionaryForObject(
        object,
      );

    if (!dict) {
      continue;
    }

    const metadata =
      dict.get(metadataKey);

    if (metadata instanceof PDFRef) {
      references.set(
        metadata.toString(),
        metadata,
      );
    }
    else if (
      metadata instanceof PDFStream
    ) {
      directCount += 1;
    }
  }

  return {
    references,
    directCount,
  };
}

function inspectPdfMetadataDocument(
  doc: PDFDocument,
): PdfMetadataSummary {
  const info =
    metadataInfoDictionary(doc);

  const {
    references,
    directCount,
  } = xmpMetadataReferences(doc);

  return {
    title:
      metadataTextValue(
        info,
        'Title',
      ),
    author:
      metadataTextValue(
        info,
        'Author',
      ),
    subject:
      metadataTextValue(
        info,
        'Subject',
      ),
    keywords:
      metadataTextValue(
        info,
        'Keywords',
      ),
    creator:
      metadataTextValue(
        info,
        'Creator',
      ),
    producer:
      metadataTextValue(
        info,
        'Producer',
      ),
    creationDate:
      metadataDateValue(
        info,
        'CreationDate',
      ),
    modificationDate:
      metadataDateValue(
        info,
        'ModDate',
      ),
    infoFieldCount:
      info?.entries().length ?? 0,
    xmpMetadataCount:
      references.size +
      directCount,
    hasDocumentId:
      doc.context.trailerInfo.ID !==
      undefined,
  };
}

function stripPdfMetadataDocument(
  doc: PDFDocument,
) {
  const referencesToDelete =
    new Map<string, PDFRef>();

  const info =
    doc.context.trailerInfo.Info;

  if (info instanceof PDFRef) {
    referencesToDelete.set(
      info.toString(),
      info,
    );
  }

  const documentId =
    doc.context.trailerInfo.ID;

  if (documentId instanceof PDFRef) {
    referencesToDelete.set(
      documentId.toString(),
      documentId,
    );
  }

  doc.context.trailerInfo.Info =
    undefined;

  doc.context.trailerInfo.ID =
    undefined;

  const metadataKey =
    PDFName.of('Metadata');

  for (
    const [ref, object]
    of doc.context.enumerateIndirectObjects()
  ) {
    if (isMetadataStream(object)) {
      referencesToDelete.set(
        ref.toString(),
        ref,
      );
    }

    const dict =
      metadataDictionaryForObject(
        object,
      );

    if (!dict) {
      continue;
    }

    const metadata =
      dict.get(metadataKey);

    if (metadata instanceof PDFRef) {
      referencesToDelete.set(
        metadata.toString(),
        metadata,
      );
    }

    dict.delete(metadataKey);
  }

  for (
    const ref
    of referencesToDelete.values()
  ) {
    doc.context.delete(ref);
  }
}

interface ResolvedTextWatermarkOptions {
  text: string;
  position: WatermarkPosition;
  fontSize: number;
  opacity: number;
  rotation: number;
  margin: number;
  firstPage: number;
  lastPage: number;
}

function validateTextWatermarkOptions(
  options: TextWatermarkOptions,
  pageCount: number,
): ResolvedTextWatermarkOptions {
  const text =
    options.text.trim();

  const position =
    options.position ?? 'center';

  const fontSize =
    options.fontSize ?? 48;

  const opacity =
    options.opacity ?? 0.18;

  const rotation =
    options.rotation ?? -35;

  const margin =
    options.margin ?? 32;

  const firstPage =
    options.firstPage ?? 1;

  const lastPage =
    options.lastPage ?? pageCount;

  if (text.length === 0) {
    throw new Error(
      'Scrivi il testo della filigrana.',
    );
  }

  if (text.length > 120) {
    throw new Error(
      'La filigrana può contenere al massimo 120 caratteri.',
    );
  }

  if (
    position !== 'center' &&
    position !== 'top-left' &&
    position !== 'top-right' &&
    position !== 'bottom-left' &&
    position !== 'bottom-right'
  ) {
    throw new Error(
      'Posizione della filigrana non valida.',
    );
  }

  if (
    !Number.isFinite(fontSize) ||
    fontSize < 12 ||
    fontSize > 144
  ) {
    throw new Error(
      'La dimensione della filigrana deve essere compresa tra 12 e 144.',
    );
  }

  if (
    !Number.isFinite(opacity) ||
    opacity < 0.05 ||
    opacity > 1
  ) {
    throw new Error(
      'L’opacità della filigrana deve essere compresa tra 5% e 100%.',
    );
  }

  if (
    !Number.isFinite(rotation) ||
    rotation < -180 ||
    rotation > 180
  ) {
    throw new Error(
      'La rotazione della filigrana deve essere compresa tra -180° e 180°.',
    );
  }

  if (
    !Number.isFinite(margin) ||
    margin < 0 ||
    margin > 144
  ) {
    throw new Error(
      'Il margine della filigrana deve essere compreso tra 0 e 144 punti.',
    );
  }

  if (
    !Number.isInteger(firstPage) ||
    firstPage < 1 ||
    firstPage > pageCount
  ) {
    throw new Error(
      'La prima pagina della filigrana non è valida.',
    );
  }

  if (
    !Number.isInteger(lastPage) ||
    lastPage < 1 ||
    lastPage > pageCount
  ) {
    throw new Error(
      'L’ultima pagina della filigrana non è valida.',
    );
  }

  if (firstPage > lastPage) {
    throw new Error(
      'La prima pagina non può venire dopo l’ultima.',
    );
  }

  return {
    text,
    position,
    fontSize,
    opacity,
    rotation,
    margin,
    firstPage,
    lastPage,
  };
}

function rotatedRectangleSize(
  width: number,
  height: number,
  angleDegrees: number,
) {
  const radians =
    angleDegrees *
    Math.PI /
    180;

  const cosine =
    Math.abs(
      Math.cos(radians),
    );

  const sine =
    Math.abs(
      Math.sin(radians),
    );

  return {
    width:
      width * cosine +
      height * sine,
    height:
      width * sine +
      height * cosine,
  };
}

function watermarkVisualCenter(
  position: WatermarkPosition,
  pageWidth: number,
  pageHeight: number,
  boxWidth: number,
  boxHeight: number,
  margin: number,
) {
  const halfWidth =
    boxWidth / 2;

  const halfHeight =
    boxHeight / 2;

  const left =
    Math.min(
      pageWidth - halfWidth,
      Math.max(
        halfWidth,
        margin + halfWidth,
      ),
    );

  const right =
    Math.max(
      halfWidth,
      Math.min(
        pageWidth - halfWidth,
        pageWidth - margin - halfWidth,
      ),
    );

  const bottom =
    Math.min(
      pageHeight - halfHeight,
      Math.max(
        halfHeight,
        margin + halfHeight,
      ),
    );

  const top =
    Math.max(
      halfHeight,
      Math.min(
        pageHeight - halfHeight,
        pageHeight - margin - halfHeight,
      ),
    );

  switch (position) {
    case 'top-left':
      return {
        x: left,
        y: top,
      };

    case 'top-right':
      return {
        x: right,
        y: top,
      };

    case 'bottom-left':
      return {
        x: left,
        y: bottom,
      };

    case 'bottom-right':
      return {
        x: right,
        y: bottom,
      };

    default:
      return {
        x: pageWidth / 2,
        y: pageHeight / 2,
      };
  }
}

function textOriginFromCenter(
  centerX: number,
  centerY: number,
  textWidth: number,
  textHeight: number,
  rotationDegrees: number,
) {
  const radians =
    rotationDegrees *
    Math.PI /
    180;

  const halfWidth =
    textWidth / 2;

  const halfHeight =
    textHeight / 2;

  const offsetX =
    halfWidth *
      Math.cos(radians) -
    halfHeight *
      Math.sin(radians);

  const offsetY =
    halfWidth *
      Math.sin(radians) +
    halfHeight *
      Math.cos(radians);

  return {
    x: centerX - offsetX,
    y: centerY - offsetY,
  };
}

interface ResolvedPageNumberOptions {
  position: PageNumberPosition;
  firstPage: number;
  startNumber: number;
  fontSize: number;
  margin: number;
}

function validatePageNumberOptions(
  options: PageNumberOptions,
  pageCount: number,
): ResolvedPageNumberOptions {
  const position =
    options.position ?? 'bottom-center';

  const firstPage =
    options.firstPage ?? 1;

  const startNumber =
    options.startNumber ?? 1;

  const fontSize =
    options.fontSize ?? 11;

  const margin =
    options.margin ?? 24;

  if (
    position !== 'bottom-left' &&
    position !== 'bottom-center' &&
    position !== 'bottom-right'
  ) {
    throw new Error(
      'Posizione dei numeri di pagina non valida.',
    );
  }

  if (
    !Number.isInteger(firstPage) ||
    firstPage < 1 ||
    firstPage > pageCount
  ) {
    throw new Error(
      'La prima pagina da numerare non è valida.',
    );
  }

  if (
    !Number.isInteger(startNumber) ||
    startNumber < 1
  ) {
    throw new Error(
      'Il numero iniziale deve essere almeno 1.',
    );
  }

  if (
    !Number.isFinite(fontSize) ||
    fontSize < 6 ||
    fontSize > 72
  ) {
    throw new Error(
      'La dimensione del numero deve essere compresa tra 6 e 72.',
    );
  }

  if (
    !Number.isFinite(margin) ||
    margin < 0 ||
    margin > 144
  ) {
    throw new Error(
      'Il margine deve essere compreso tra 0 e 144 punti.',
    );
  }

  return {
    position,
    firstPage,
    startNumber,
    fontSize,
    margin,
  };
}

type QuarterRotation =
  | 0
  | 90
  | 180
  | 270;

function normalizeQuarterRotation(
  angle: number,
): QuarterRotation {
  const normalized =
    ((angle % 360) + 360) % 360;

  if (
    normalized !== 0 &&
    normalized !== 90 &&
    normalized !== 180 &&
    normalized !== 270
  ) {
    throw new Error(
      'La rotazione della pagina non è supportata.',
    );
  }

  return normalized;
}

function visualPageSize(
  width: number,
  height: number,
  rotation: QuarterRotation,
) {
  if (
    rotation === 90 ||
    rotation === 270
  ) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

function pageNumberVisualX(
  position: PageNumberPosition,
  pageWidth: number,
  textWidth: number,
  margin: number,
) {
  const maxX =
    Math.max(0, pageWidth - textWidth);

  if (position === 'bottom-left') {
    return Math.min(
      maxX,
      Math.max(0, margin),
    );
  }

  if (position === 'bottom-right') {
    return Math.max(
      0,
      Math.min(
        maxX,
        pageWidth - margin - textWidth,
      ),
    );
  }

  return Math.max(
    0,
    Math.min(
      maxX,
      (pageWidth - textWidth) / 2,
    ),
  );
}

function visualToPagePoint(
  visualX: number,
  visualY: number,
  pageWidth: number,
  pageHeight: number,
  rotation: QuarterRotation,
) {
  switch (rotation) {
    case 90:
      return {
        x: pageWidth - visualY,
        y: visualX,
      };

    case 180:
      return {
        x: pageWidth - visualX,
        y: pageHeight - visualY,
      };

    case 270:
      return {
        x: visualY,
        y: pageHeight - visualX,
      };

    default:
      return {
        x: visualX,
        y: visualY,
      };
  }
}

async function createProtectionToolkit() {
  const {
    createPdfToolkit,
  } =
    await import(
      'pdfstudio'
    );

  return createPdfToolkit();
}

let protectionToolkitPromise:
  | ReturnType<
      typeof createProtectionToolkit
    >
  | null = null;

function getProtectionToolkit() {
  if (!protectionToolkitPromise) {
    protectionToolkitPromise =
      createProtectionToolkit();
  }

  return protectionToolkitPromise;
}

interface ResolvedProtectPdfOptions {
  password: string;
  permissions: Required<ProtectPdfPermissions>;
}

function validateProtectPdfOptions(
  options: ProtectPdfOptions,
): ResolvedProtectPdfOptions {
  if (
    options.password.trim().length === 0 ||
    options.password.length < 8
  ) {
    throw new Error(
      'La password deve contenere almeno 8 caratteri.',
    );
  }

  return {
    password:
      options.password,
    permissions: {
      print:
        options.permissions?.print ??
        true,
      modify:
        options.permissions?.modify ??
        true,
      extract:
        options.permissions?.extract ??
        true,
    },
  };
}

function createOwnerPassword() {
  const cryptoApi =
    globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error(
      'Impossibile generare in modo sicuro la protezione del PDF.',
    );
  }

  const bytes =
    new Uint8Array(32);

  cryptoApi.getRandomValues(
    bytes,
  );

  return Array
    .from(
      bytes,
      (value) =>
        value
          .toString(16)
          .padStart(2, '0'),
    )
    .join('');
}

function protectionInfoFromToolkit(
  encrypted: boolean,
  requiresPassword: boolean,
  info?: {
    encryption?: {
      bits: number;
      method: string;
      userPasswordMatched: boolean;
      ownerPasswordMatched: boolean;
      permissions: {
        print: boolean;
        modify: boolean;
        extract: boolean;
      };
    };
  },
): PdfProtectionInfo {
  if (
    !encrypted ||
    !info?.encryption
  ) {
    return {
      encrypted,
      requiresPassword,
    };
  }

  return {
    encrypted,
    requiresPassword,
    bits:
      info.encryption.bits,
    method:
      info.encryption.method,
    userPasswordMatched:
      info.encryption
        .userPasswordMatched,
    ownerPasswordMatched:
      info.encryption
        .ownerPasswordMatched,
    permissions: {
      print:
        info.encryption
          .permissions.print,
      modify:
        info.encryption
          .permissions.modify,
      extract:
        info.encryption
          .permissions.extract,
    },
  };
}

function validateCompressionPreset(
  preset: CompressionPreset,
): CompressionPreset {
  if (
    preset !== 'light' &&
    preset !== 'recommended' &&
    preset !== 'strong'
  ) {
    throw new Error(
      'Livello di compressione non valido.',
    );
  }

  return preset;
}

async function createCompressionToolkit() {
  const { createPdfToolkit } = await import('pdfstudio');

  return createPdfToolkit();
}

let compressionToolkitPromise:
  | ReturnType<typeof createCompressionToolkit>
  | null = null;

function getCompressionToolkit() {
  if (!compressionToolkitPromise) {
    compressionToolkitPromise = createCompressionToolkit();
  }

  return compressionToolkitPromise;
}

export async function repairPdfDocument(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  if (bytes.byteLength === 0) {
    throw new Error(
      'Il PDF è vuoto.',
    );
  }

  try {
    const toolkit =
      await getCompressionToolkit();

    return await toolkit.repair(
      bytes,
    );
  } catch (caught) {
    const detail =
      caught instanceof Error
        ? caught.message
        : String(caught);

    throw new Error(
      detail
        ? `Impossibile riparare il PDF: ${detail}`
        : 'Impossibile riparare il PDF.',
    );
  }
}

function qpdfCompressionArgs(
  preset: Exclude<CompressionPreset, 'light'>,
): string[] {
  const jpegQuality =
    preset === 'recommended'
      ? 78
      : 55;

  return [
    '--compress-streams=y',
    '--decode-level=generalized',
    '--recompress-flate',
    '--compression-level=9',
    '--object-streams=generate',
    '--optimize-images',
    '--jpeg-quality=' + jpegQuality,
    '$in0',
    '$out',
  ];
}

const IMAGES_TO_PDF_A4_SIZE:
  readonly [number, number] = [
    595.28,
    841.89,
  ];

const IMAGES_TO_PDF_LETTER_SIZE:
  readonly [number, number] = [
    612,
    792,
  ];

function validateImagesToPdfOptions(
  options: ImagesToPdfOptions,
) {
  const margin = options.margin ?? 24;
  const pageSize = options.pageSize ?? 'auto';
  const orientation =
    options.orientation ?? 'auto';
  const fit = options.fit ?? 'contain';

  if (
    !Number.isFinite(margin) ||
    margin < 0
  ) {
    throw new Error(
      'Il margine deve essere maggiore o uguale a zero.',
    );
  }

  if (
    pageSize !== 'auto' &&
    pageSize !== 'a4' &&
    pageSize !== 'letter'
  ) {
    throw new Error(
      'Formato pagina non valido.',
    );
  }

  if (
    orientation !== 'auto' &&
    orientation !== 'portrait' &&
    orientation !== 'landscape'
  ) {
    throw new Error(
      'Orientamento pagina non valido.',
    );
  }

  if (
    fit !== 'contain' &&
    fit !== 'cover'
  ) {
    throw new Error(
      'Modalità di adattamento non valida.',
    );
  }

  return {
    margin,
    pageSize,
    orientation,
    fit,
  } as const;
}

function rotatedImageDimensions(
  width: number,
  height: number,
  rotation: PageRotation,
) {
  if (
    rotation === 90 ||
    rotation === 270
  ) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

function resolveImagesPdfPageSize(
  pageSize: ImagesPdfPageSize,
  orientation: ImagesPdfOrientation,
  imageWidth: number,
  imageHeight: number,
  margin: number,
): [number, number] {
  if (pageSize === 'auto') {
    let width =
      imageWidth + margin * 2;

    let height =
      imageHeight + margin * 2;

    if (
      orientation === 'portrait' &&
      width > height
    ) {
      [width, height] = [height, width];
    }

    if (
      orientation === 'landscape' &&
      height > width
    ) {
      [width, height] = [height, width];
    }

    return [width, height];
  }

  const base =
    pageSize === 'a4'
      ? IMAGES_TO_PDF_A4_SIZE
      : IMAGES_TO_PDF_LETTER_SIZE;

  const landscape =
    orientation === 'landscape' ||
    (
      orientation === 'auto' &&
      imageWidth > imageHeight
    );

  return landscape
    ? [base[1], base[0]]
    : [base[0], base[1]];
}
export class BrowserPdfEngine implements PdfEngine {
  async merge(files: Bytes[]): Promise<Bytes> {
    const output = await PDFDocument.create();

    for (const bytes of files) {
      const source = await PDFDocument.load(bytes);

      const pages = await output.copyPages(
        source,
        source.getPageIndices(),
      );

      pages.forEach((page) => output.addPage(page));
    }

    return output.save();
  }

  async rotate(
    file: Bytes,
    pageIndexes: number[],
    clockwiseDegrees: 90 | 180 | 270,
  ): Promise<Bytes> {
    const doc = await PDFDocument.load(file);
    const selected = new Set(pageIndexes);

    doc.getPages().forEach((page, index) => {
      if (!selected.has(index)) {
        return;
      }

      const current = page.getRotation().angle;

      page.setRotation(
        degrees((current + clockwiseDegrees) % 360),
      );
    });

    return doc.save();
  }

  async removePages(
    file: Bytes,
    pageIndexes: number[],
  ): Promise<Bytes> {
    const doc = await PDFDocument.load(file);
    const pageCount = doc.getPageCount();
    const uniqueIndexes = [...new Set(pageIndexes)];

    for (const index of uniqueIndexes) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= pageCount
      ) {
        throw new Error(
          `Indice pagina da rimuovere non valido: ${index}`,
        );
      }
    }

    if (uniqueIndexes.length >= pageCount) {
      throw new Error(
        'Un PDF deve contenere almeno una pagina.',
      );
    }

    uniqueIndexes
      .sort((a, b) => b - a)
      .forEach((index) => doc.removePage(index));

    return doc.save();
  }

  async organize(
    file: Bytes,
    pages: PageTransform[],
  ): Promise<Bytes> {
    const source = await PDFDocument.load(file);

    validateTransforms(
      source.getPageCount(),
      pages,
    );

    const output = await PDFDocument.create();

    const copiedPages = await output.copyPages(
      source,
      pages.map((page) => page.sourceIndex),
    );

    copiedPages.forEach((page, index) => {
      const transform = pages[index];
      const current = page.getRotation().angle;

      page.setRotation(
        degrees(
          (current + transform.rotation) % 360,
        ),
      );

      output.addPage(page);
    });

    return output.save();
  }

  async extract(
    file: Bytes,
    pages: PageTransform[],
  ): Promise<Bytes> {
    return this.organize(file, pages);
  }

  async crop(
    file: Bytes,
    crops: PageCrop[],
  ): Promise<Bytes> {
    const doc = await PDFDocument.load(file);
    const pageCount = doc.getPageCount();

    for (const crop of crops) {
      validateCrop(pageCount, crop);

      const page = doc.getPage(crop.pageIndex);

      page.setCropBox(
        crop.x,
        crop.y,
        crop.width,
        crop.height,
      );
    }

    return doc.save();
  }

  async inspectProtection(
    file: Bytes,
    password?: string,
  ): Promise<PdfProtectionInfo> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da controllare è vuoto.',
      );
    }

    const toolkit =
      await getProtectionToolkit();

    const encrypted =
      await toolkit.isEncrypted(
        file,
      );

    if (!encrypted) {
      return {
        encrypted: false,
        requiresPassword: false,
      };
    }

    const requiresPassword =
      await toolkit.requiresPassword(
        file,
      );

    if (password === undefined) {
      return {
        encrypted: true,
        requiresPassword,
      };
    }

    const info =
      await toolkit.getInfo(
        file,
        {
          password,
        },
      );

    return protectionInfoFromToolkit(
      true,
      requiresPassword,
      info,
    );
  }

  async protect(
    file: Bytes,
    options: ProtectPdfOptions,
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da proteggere è vuoto.',
      );
    }

    const {
      password,
      permissions,
    } =
      validateProtectPdfOptions(
        options,
      );

    const toolkit =
      await getProtectionToolkit();

    if (
      await toolkit.isEncrypted(
        file,
      )
    ) {
      throw new Error(
        'Il PDF è già protetto da cifratura.',
      );
    }

    const output =
      await toolkit.lock(
        file,
        {
          userPassword:
            password,
          ownerPassword:
            createOwnerPassword(),
          keyLength: 256,
          permissions: {
            print:
              permissions.print
                ? 'full'
                : 'none',
            modify:
              permissions.modify
                ? 'all'
                : 'none',
            extract:
              permissions.extract,
          },
        },
      );

    const verification =
      await toolkit.getInfo(
        output,
        {
          password,
        },
      );

    const encryption =
      verification.encryption;

    if (
      !verification.encrypted ||
      !encryption ||
      encryption.bits !== 256 ||
      !encryption.method
        .toUpperCase()
        .includes('AES') ||
      !encryption
        .userPasswordMatched
    ) {
      throw new Error(
        'La verifica della cifratura AES-256 non è riuscita.',
      );
    }

    if (
      encryption.permissions.print !==
        permissions.print ||
      encryption.permissions.modify !==
        permissions.modify ||
      encryption.permissions.extract !==
        permissions.extract
    ) {
      throw new Error(
        'La verifica dei permessi del PDF non è riuscita.',
      );
    }

    return output;
  }

  async unlock(
    file: Bytes,
    password = '',
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da sbloccare è vuoto.',
      );
    }

    const toolkit =
      await getProtectionToolkit();

    const encrypted =
      await toolkit.isEncrypted(
        file,
      );

    if (!encrypted) {
      throw new Error(
        'Questo PDF non è protetto da password.',
      );
    }

    const requiresPassword =
      await toolkit.requiresPassword(
        file,
      );

    if (
      requiresPassword &&
      password.length === 0
    ) {
      throw new Error(
        'Inserisci la password del PDF.',
      );
    }

    let output: Bytes;

    try {
      output =
        await toolkit.unlock(
          file,
          {
            password,
          },
        );
    }
    catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : String(caught);

      if (
        requiresPassword &&
        /password|passphrase|credential/i
          .test(message)
      ) {
        throw new Error(
          'Password non corretta. Riprova.',
        );
      }

      throw new Error(
        'Impossibile sbloccare il PDF.',
      );
    }

    if (
      await toolkit.isEncrypted(
        output,
      )
    ) {
      throw new Error(
        'La verifica finale del PDF sbloccato non è riuscita.',
      );
    }

    return output;
  }
  async compress(
    file: Bytes,
    preset: CompressionPreset = 'recommended',
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da comprimere è vuoto.',
      );
    }

    const selectedPreset =
      validateCompressionPreset(preset);

    const toolkit =
      await getCompressionToolkit();

    if (selectedPreset === 'light') {
      return toolkit.compress(file);
    }

    const {
      recompressEmbeddedJpegs,
    } = await import('./compress-images');

    const imageOptimized =
      await recompressEmbeddedJpegs(
        file,
        selectedPreset,
      );

    return toolkit.raw(
      [imageOptimized],
      qpdfCompressionArgs(selectedPreset),
    );
  }

  async inspectMetadata(
    file: Bytes,
  ): Promise<PdfMetadataSummary> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da controllare è vuoto.',
      );
    }

    const doc =
      await PDFDocument.load(
        file,
        {
          updateMetadata: false,
        },
      );

    return inspectPdfMetadataDocument(
      doc,
    );
  }

  async removeMetadata(
    file: Bytes,
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da pulire è vuoto.',
      );
    }

    const doc =
      await PDFDocument.load(
        file,
        {
          updateMetadata: false,
        },
      );

    stripPdfMetadataDocument(
      doc,
    );

    return doc.save();
  }

  async addTextWatermark(
    file: Bytes,
    options: TextWatermarkOptions,
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da filigranare è vuoto.',
      );
    }

    const doc =
      await PDFDocument.load(file);

    const pageCount =
      doc.getPageCount();

    if (pageCount === 0) {
      throw new Error(
        'Il PDF non contiene pagine.',
      );
    }

    const {
      text,
      position,
      fontSize,
      opacity,
      rotation,
      margin,
      firstPage,
      lastPage,
    } = validateTextWatermarkOptions(
      options,
      pageCount,
    );

    const font =
      await doc.embedFont(
        StandardFonts.HelveticaBold,
      );

    let textWidth: number;

    try {
      textWidth =
        font.widthOfTextAtSize(
          text,
          fontSize,
        );
    }
    catch {
      throw new Error(
        'Il testo della filigrana contiene caratteri non supportati.',
      );
    }

    const textHeight =
      fontSize;

    const visualBox =
      rotatedRectangleSize(
        textWidth,
        textHeight,
        rotation,
      );

    const pages =
      doc.getPages();

    for (
      let pageIndex = firstPage - 1;
      pageIndex < lastPage;
      pageIndex += 1
    ) {
      const page =
        pages[pageIndex];

      const pageWidth =
        page.getWidth();

      const pageHeight =
        page.getHeight();

      const pageRotation =
        normalizeQuarterRotation(
          page.getRotation().angle,
        );

      const visualSize =
        visualPageSize(
          pageWidth,
          pageHeight,
          pageRotation,
        );

      const visualCenter =
        watermarkVisualCenter(
          position,
          visualSize.width,
          visualSize.height,
          visualBox.width,
          visualBox.height,
          margin,
        );

      const pageCenter =
        visualToPagePoint(
          visualCenter.x,
          visualCenter.y,
          pageWidth,
          pageHeight,
          pageRotation,
        );

      const contentRotation =
        pageRotation +
        rotation;

      const origin =
        textOriginFromCenter(
          pageCenter.x,
          pageCenter.y,
          textWidth,
          textHeight,
          contentRotation,
        );

      try {
        page.drawText(
          text,
          {
            x: origin.x,
            y: origin.y,
            size: fontSize,
            font,
            color:
              rgb(
                0.24,
                0.24,
                0.27,
              ),
            opacity,
            rotate:
              degrees(
                contentRotation,
              ),
          },
        );
      }
      catch {
        throw new Error(
          'Impossibile disegnare il testo della filigrana.',
        );
      }
    }

    return doc.save();
  }

  async addPageNumbers(
    file: Bytes,
    options: PageNumberOptions = {},
  ): Promise<Bytes> {
    if (file.byteLength === 0) {
      throw new Error(
        'Il PDF da numerare è vuoto.',
      );
    }

    const doc =
      await PDFDocument.load(file);

    const pageCount =
      doc.getPageCount();

    if (pageCount === 0) {
      throw new Error(
        'Il PDF non contiene pagine.',
      );
    }

    const {
      position,
      firstPage,
      startNumber,
      fontSize,
      margin,
    } = validatePageNumberOptions(
      options,
      pageCount,
    );

    const font =
      await doc.embedFont(
        StandardFonts.Helvetica,
      );

    const color =
      rgb(0.18, 0.18, 0.2);

    const pages =
      doc.getPages();

    for (
      let pageIndex = firstPage - 1;
      pageIndex < pages.length;
      pageIndex += 1
    ) {
      const page =
        pages[pageIndex];

      const pageNumber =
        startNumber +
        pageIndex -
        (firstPage - 1);

      const label =
        String(pageNumber);

      const textWidth =
        font.widthOfTextAtSize(
          label,
          fontSize,
        );

      const pageWidth =
        page.getWidth();

      const pageHeight =
        page.getHeight();

      const rotation =
        normalizeQuarterRotation(
          page.getRotation().angle,
        );

      const visualSize =
        visualPageSize(
          pageWidth,
          pageHeight,
          rotation,
        );

      const visualX =
        pageNumberVisualX(
          position,
          visualSize.width,
          textWidth,
          margin,
        );

      const maxBaseline =
        Math.max(
          0,
          visualSize.height - fontSize,
        );

      const visualY =
        Math.min(
          maxBaseline,
          Math.max(0, margin),
        );

      const point =
        visualToPagePoint(
          visualX,
          visualY,
          pageWidth,
          pageHeight,
          rotation,
        );

      page.drawText(
        label,
        {
          x: point.x,
          y: point.y,
          size: fontSize,
          font,
          color,
          rotate: degrees(rotation),
        },
      );
    }

    return doc.save();
  }

  async createSearchablePdf(
    pages: OcrPdfPage[],
  ): Promise<Bytes> {
    if (pages.length === 0) {
      throw new Error(
        'Nessuna pagina OCR da esportare.',
      );
    }

    const output =
      await PDFDocument.create();

    const font =
      await output.embedFont(
        StandardFonts.Helvetica,
      );

    const supportedText = (
      value: string,
    ) => {
      try {
        font.encodeText(value);

        return value;
      } catch {
        let safe = '';

        for (const character of value) {
          try {
            font.encodeText(
              character,
            );

            safe += character;
          } catch {
            /*
             * Standard Helvetica usa WinAnsi.
             * Gli eventuali glifi non supportati
             * vengono ignorati senza invalidare
             * l'intero OCR.
             */
          }
        }

        return safe;
      }
    };

    const clamp = (
      value: number,
      minimum: number,
      maximum: number,
    ) =>
      Math.min(
        maximum,
        Math.max(
          minimum,
          value,
        ),
      );

    for (
      let pageIndex = 0;
      pageIndex < pages.length;
      pageIndex += 1
    ) {
      const source =
        pages[pageIndex];

      if (
        !Number.isFinite(
          source.pixelWidth,
        ) ||
        !Number.isFinite(
          source.pixelHeight,
        ) ||
        !Number.isFinite(
          source.pageWidth,
        ) ||
        !Number.isFinite(
          source.pageHeight,
        ) ||
        source.pixelWidth <= 0 ||
        source.pixelHeight <= 0 ||
        source.pageWidth <= 0 ||
        source.pageHeight <= 0
      ) {
        throw new Error(
          `Dimensioni OCR non valide per la pagina ${pageIndex + 1}.`,
        );
      }

      if (
        source.image.bytes.byteLength ===
        0
      ) {
        throw new Error(
          `Immagine OCR mancante per la pagina ${pageIndex + 1}.`,
        );
      }

      const embedded =
        source.image.format ===
        'jpeg'
          ? await output.embedJpg(
              source.image.bytes,
            )
          : source.image.format ===
              'png'
            ? await output.embedPng(
                source.image.bytes,
              )
            : null;

      if (!embedded) {
        throw new Error(
          `Formato OCR non valido per la pagina ${pageIndex + 1}.`,
        );
      }

      const page =
        output.addPage([
          source.pageWidth,
          source.pageHeight,
        ]);

      page.drawImage(
        embedded,
        {
          x: 0,
          y: 0,
          width:
            source.pageWidth,
          height:
            source.pageHeight,
        },
      );

      for (
        const line of source.lines
      ) {
        const normalized =
          line.text
            .replace(
              /\s+/g,
              ' ',
            )
            .trim();

        if (!normalized) {
          continue;
        }

        const text =
          supportedText(
            normalized,
          ).trim();

        if (!text) {
          continue;
        }

        const x0 =
          clamp(
            line.x0,
            0,
            source.pixelWidth,
          );

        const y0 =
          clamp(
            line.y0,
            0,
            source.pixelHeight,
          );

        const x1 =
          clamp(
            line.x1,
            0,
            source.pixelWidth,
          );

        const y1 =
          clamp(
            line.y1,
            0,
            source.pixelHeight,
          );

        if (
          x1 <= x0 ||
          y1 <= y0
        ) {
          continue;
        }

        const x =
          (
            x0 /
            source.pixelWidth
          ) *
          source.pageWidth;

        const y =
          source.pageHeight -
          (
            y1 /
            source.pixelHeight
          ) *
          source.pageHeight;

        const boxWidth =
          (
            (x1 - x0) /
            source.pixelWidth
          ) *
          source.pageWidth;

        const boxHeight =
          (
            (y1 - y0) /
            source.pixelHeight
          ) *
          source.pageHeight;

        /*
         * Prima stimiamo la dimensione dalla
         * reale altezza della parola riconosciuta.
         */
        let fontSize =
          Math.max(
            1,
            Math.min(
              72,
              boxHeight * 0.82,
            ),
          );

        /*
         * Helvetica non avrà quasi mai la stessa
         * metrica del font presente nella scansione.
         *
         * Se il testo invisibile uscisse dal bbox
         * OCR, riduciamo il font affinché resti
         * dentro l'area della parola.
         */
        const measuredWidth =
          font.widthOfTextAtSize(
            text,
            fontSize,
          );

        if (
          measuredWidth >
            boxWidth &&
          measuredWidth > 0 &&
          boxWidth > 0
        ) {
          fontSize =
            Math.max(
              1,
              fontSize *
                (
                  boxWidth /
                  measuredWidth
                ),
            );
        }

        /*
         * Ogni parola possiede ora il proprio
         * punto di origine e il proprio bbox.
         * Il testo resta invisibile ma ricerca,
         * evidenziazione e selezione seguono molto
         * meglio la scansione originale.
         */
        page.drawText(
          text,
          {
            x,
            y:
              Math.max(
                0,
                y,
              ),
            size:
              fontSize,
            font,
            color:
              rgb(
                0,
                0,
                0,
              ),
            opacity: 0,
          },
        );
      }
    }

    return output.save();
  }
  async imagesToPdf(
    images: PdfImageSource[],
    options: ImagesToPdfOptions = {},
  ): Promise<Bytes> {
    if (images.length === 0) {
      throw new Error(
        'Aggiungi almeno un’immagine.',
      );
    }

    const {
      margin,
      pageSize,
      orientation,
      fit,
    } = validateImagesToPdfOptions(options);

    const output =
      await PDFDocument.create();

    for (const source of images) {
      if (source.bytes.byteLength === 0) {
        throw new Error(
          'Una delle immagini è vuota.',
        );
      }

      if (
        source.format !== 'jpeg' &&
        source.format !== 'png'
      ) {
        throw new Error(
          'Formato immagine non supportato.',
        );
      }

      const rotation =
        source.rotation ?? 0;

      if (
        rotation !== 0 &&
        rotation !== 90 &&
        rotation !== 180 &&
        rotation !== 270
      ) {
        throw new Error(
          'Rotazione immagine non valida.',
        );
      }

      const embedded =
        source.format === 'jpeg'
          ? await output.embedJpg(source.bytes)
          : await output.embedPng(source.bytes);

      const rotated =
        rotatedImageDimensions(
          embedded.width,
          embedded.height,
          rotation,
        );

      /*
       * In modalità cover il contenuto riempie
       * l'intera pagina, quindi il margine visivo
       * viene intenzionalmente ignorato.
       */
      const contentMargin =
        fit === 'cover'
          ? 0
          : margin;

      const [
        pageWidth,
        pageHeight,
      ] = resolveImagesPdfPageSize(
        pageSize,
        orientation,
        rotated.width,
        rotated.height,
        contentMargin,
      );

      const availableWidth =
        pageWidth -
        contentMargin * 2;

      const availableHeight =
        pageHeight -
        contentMargin * 2;

      if (
        availableWidth <= 0 ||
        availableHeight <= 0
      ) {
        throw new Error(
          'Il margine è troppo grande per il formato pagina selezionato.',
        );
      }

      const scaleX =
        availableWidth /
        rotated.width;

      const scaleY =
        availableHeight /
        rotated.height;

      const scale =
        fit === 'cover'
          ? Math.max(
              scaleX,
              scaleY,
            )
          : Math.min(
              scaleX,
              scaleY,
            );

      const drawWidth =
        embedded.width * scale;

      const drawHeight =
        embedded.height * scale;

      const page =
        output.addPage([
          pageWidth,
          pageHeight,
        ]);

      if (rotation === 0) {
        page.drawImage(
          embedded,
          {
            x:
              (pageWidth -
                drawWidth) / 2,
            y:
              (pageHeight -
                drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          },
        );

        continue;
      }

      if (rotation === 90) {
        page.drawImage(
          embedded,
          {
            x:
              (pageWidth +
                drawHeight) / 2,
            y:
              (pageHeight -
                drawWidth) / 2,
            width: drawWidth,
            height: drawHeight,
            rotate: degrees(90),
          },
        );

        continue;
      }

      if (rotation === 180) {
        page.drawImage(
          embedded,
          {
            x:
              (pageWidth +
                drawWidth) / 2,
            y:
              (pageHeight +
                drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
            rotate: degrees(180),
          },
        );

        continue;
      }

      page.drawImage(
        embedded,
        {
          x:
            (pageWidth -
              drawHeight) / 2,
          y:
            (pageHeight +
              drawWidth) / 2,
          width: drawWidth,
          height: drawHeight,
          rotate: degrees(270),
        },
      );
    }

    return output.save();
  }
}

export * from './forms';

export * from './compare';
export * from './visual-signature';
