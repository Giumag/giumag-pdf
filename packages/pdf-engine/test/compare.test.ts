import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  compareRgbaPixels,
} from '../src';

describe(
  'compareRgbaPixels',
  () => {
    it(
      'recognizes identical pixels',
      () => {
        const pixels =
          new Uint8Array([
            255, 255, 255, 255,
            10, 20, 30, 255,
          ]);

        const result =
          compareRgbaPixels(
            pixels,
            pixels,
          );

        expect(
          result.differentPixels,
        ).toBe(0);

        expect(
          result.differencePercent,
        ).toBe(0);
      },
    );

    it(
      'ignores changes below threshold',
      () => {
        const left =
          new Uint8Array([
            100, 100, 100, 255,
          ]);

        const right =
          new Uint8Array([
            110, 110, 110, 255,
          ]);

        const result =
          compareRgbaPixels(
            left,
            right,
            {
              threshold: 20,
            },
          );

        expect(
          result.differentPixels,
        ).toBe(0);
      },
    );

    it(
      'detects changed pixels',
      () => {
        const left =
          new Uint8Array([
            255, 255, 255, 255,
            255, 255, 255, 255,
          ]);

        const right =
          new Uint8Array([
            0, 0, 0, 255,
            255, 255, 255, 255,
          ]);

        const result =
          compareRgbaPixels(
            left,
            right,
            {
              threshold: 28,
            },
          );

        expect(
          result.differentPixels,
        ).toBe(1);

        expect(
          result.differencePercent,
        ).toBe(50);

        expect(
          Array.from(result.mask),
        ).toEqual([
          1,
          0,
        ]);
      },
    );
  },
);