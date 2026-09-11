export interface RgbaDifferenceOptions {
  threshold?: number;
}

export interface RgbaDifferenceResult {
  differentPixels: number;
  totalPixels: number;
  differencePercent: number;
  mask: Uint8Array;
}

export function compareRgbaPixels(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
  options: RgbaDifferenceOptions = {},
): RgbaDifferenceResult {
  if (left.length !== right.length) {
    throw new Error(
      'I buffer RGBA devono avere la stessa lunghezza.',
    );
  }

  if (left.length % 4 !== 0) {
    throw new Error(
      'Il buffer RGBA non è valido.',
    );
  }

  const threshold = Math.min(
    255,
    Math.max(
      0,
      Math.round(options.threshold ?? 28),
    ),
  );

  const totalPixels =
    left.length / 4;

  const mask =
    new Uint8Array(totalPixels);

  let differentPixels = 0;

  for (
    let pixelIndex = 0;
    pixelIndex < totalPixels;
    pixelIndex += 1
  ) {
    const offset =
      pixelIndex * 4;

    const red = Math.abs(
      Number(left[offset] ?? 0) -
        Number(right[offset] ?? 0),
    );

    const green = Math.abs(
      Number(left[offset + 1] ?? 0) -
        Number(right[offset + 1] ?? 0),
    );

    const blue = Math.abs(
      Number(left[offset + 2] ?? 0) -
        Number(right[offset + 2] ?? 0),
    );

    const difference =
      Math.max(
        red,
        green,
        blue,
      );

    if (difference > threshold) {
      mask[pixelIndex] = 1;
      differentPixels += 1;
    }
  }

  const differencePercent =
    totalPixels > 0
      ? (
          differentPixels /
          totalPixels
        ) * 100
      : 0;

  return {
    differentPixels,
    totalPixels,
    differencePercent,
    mask,
  };
}