export interface StoreZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value =
        (value & 1) !== 0
          ? 0xedb88320 ^ (value >>> 1)
          : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(
  bytes: Uint8Array,
): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc =
      CRC32_TABLE[
        (crc ^ byte) & 0xff
      ] ^
      (crc >>> 8);
  }

  return (
    crc ^ 0xffffffff
  ) >>> 0;
}

function getDosDateTime(
  date: Date,
) {
  const year =
    Math.max(
      1980,
      date.getFullYear(),
    );

  return {
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),

    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(
        date.getSeconds() / 2,
      ),
  };
}

function concatBytes(
  parts: readonly Uint8Array[],
): Uint8Array {
  const total =
    parts.reduce(
      (sum, part) =>
        sum + part.byteLength,
      0,
    );

  const output =
    new Uint8Array(total);

  let offset = 0;

  for (const part of parts) {
    output.set(
      part,
      offset,
    );

    offset +=
      part.byteLength;
  }

  return output;
}

function createLocalHeader(
  fileName: Uint8Array,
  crc: number,
  size: number,
  time: number,
  date: number,
): Uint8Array {
  const output =
    new Uint8Array(
      30 +
      fileName.byteLength,
    );

  const view =
    new DataView(
      output.buffer,
    );

  view.setUint32(
    0,
    0x04034b50,
    true,
  );

  view.setUint16(
    4,
    20,
    true,
  );

  // UTF-8
  view.setUint16(
    6,
    0x0800,
    true,
  );

  // Store, nessuna compressione.
  view.setUint16(
    8,
    0,
    true,
  );

  view.setUint16(
    10,
    time,
    true,
  );

  view.setUint16(
    12,
    date,
    true,
  );

  view.setUint32(
    14,
    crc,
    true,
  );

  view.setUint32(
    18,
    size,
    true,
  );

  view.setUint32(
    22,
    size,
    true,
  );

  view.setUint16(
    26,
    fileName.byteLength,
    true,
  );

  view.setUint16(
    28,
    0,
    true,
  );

  output.set(
    fileName,
    30,
  );

  return output;
}

function createCentralHeader(
  fileName: Uint8Array,
  crc: number,
  size: number,
  time: number,
  date: number,
  localOffset: number,
): Uint8Array {
  const output =
    new Uint8Array(
      46 +
      fileName.byteLength,
    );

  const view =
    new DataView(
      output.buffer,
    );

  view.setUint32(
    0,
    0x02014b50,
    true,
  );

  view.setUint16(
    4,
    20,
    true,
  );

  view.setUint16(
    6,
    20,
    true,
  );

  view.setUint16(
    8,
    0x0800,
    true,
  );

  view.setUint16(
    10,
    0,
    true,
  );

  view.setUint16(
    12,
    time,
    true,
  );

  view.setUint16(
    14,
    date,
    true,
  );

  view.setUint32(
    16,
    crc,
    true,
  );

  view.setUint32(
    20,
    size,
    true,
  );

  view.setUint32(
    24,
    size,
    true,
  );

  view.setUint16(
    28,
    fileName.byteLength,
    true,
  );

  view.setUint16(
    30,
    0,
    true,
  );

  view.setUint16(
    32,
    0,
    true,
  );

  view.setUint16(
    34,
    0,
    true,
  );

  view.setUint16(
    36,
    0,
    true,
  );

  view.setUint32(
    38,
    0,
    true,
  );

  view.setUint32(
    42,
    localOffset,
    true,
  );

  output.set(
    fileName,
    46,
  );

  return output;
}

export function createStoreZip(
  entries: readonly StoreZipEntry[],
): Uint8Array {
  if (entries.length === 0) {
    throw new Error(
      'Nessun file da inserire nello ZIP.',
    );
  }

  if (entries.length > 0xffff) {
    throw new Error(
      'Troppi file per un singolo archivio ZIP.',
    );
  }

  const encoder =
    new TextEncoder();

  const now =
    getDosDateTime(
      new Date(),
    );

  const localParts:
    Uint8Array[] = [];

  const centralParts:
    Uint8Array[] = [];

  let localOffset = 0;

  for (const entry of entries) {
    const fileName =
      encoder.encode(
        entry.name,
      );

    if (
      fileName.byteLength >
      0xffff
    ) {
      throw new Error(
        'Nome file troppo lungo per lo ZIP.',
      );
    }

    if (
      entry.data.byteLength >
      0xffffffff
    ) {
      throw new Error(
        'Un file supera il limite ZIP classico di 4 GB.',
      );
    }

    const crc =
      crc32(
        entry.data,
      );

    const local =
      createLocalHeader(
        fileName,
        crc,
        entry.data.byteLength,
        now.time,
        now.date,
      );

    localParts.push(
      local,
      entry.data,
    );

    centralParts.push(
      createCentralHeader(
        fileName,
        crc,
        entry.data.byteLength,
        now.time,
        now.date,
        localOffset,
      ),
    );

    localOffset +=
      local.byteLength +
      entry.data.byteLength;

    if (
      localOffset >
      0xffffffff
    ) {
      throw new Error(
        'Archivio troppo grande per il formato ZIP classico.',
      );
    }
  }

  const central =
    concatBytes(
      centralParts,
    );

  if (
    localOffset +
      central.byteLength >
    0xffffffff
  ) {
    throw new Error(
      'Archivio troppo grande per il formato ZIP classico.',
    );
  }

  const end =
    new Uint8Array(22);

  const endView =
    new DataView(
      end.buffer,
    );

  endView.setUint32(
    0,
    0x06054b50,
    true,
  );

  endView.setUint16(
    4,
    0,
    true,
  );

  endView.setUint16(
    6,
    0,
    true,
  );

  endView.setUint16(
    8,
    entries.length,
    true,
  );

  endView.setUint16(
    10,
    entries.length,
    true,
  );

  endView.setUint32(
    12,
    central.byteLength,
    true,
  );

  endView.setUint32(
    16,
    localOffset,
    true,
  );

  endView.setUint16(
    20,
    0,
    true,
  );

  return concatBytes([
    ...localParts,
    central,
    end,
  ]);
}
