import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PDFDocument,
} from 'pdf-lib';

import {
  fillPdfForm,
  inspectPdfForm,
} from '../src';

async function createPdf() {
  const document =
    await PDFDocument.create();

  const page =
    document.addPage([
      420,
      500,
    ]);

  const form =
    document.getForm();

  const name =
    form.createTextField(
      'nome',
    );

  name.addToPage(
    page,
    {
      x: 40,
      y: 420,
      width: 220,
      height: 28,
    },
  );

  const accepted =
    form.createCheckBox(
      'accetto',
    );

  accepted.addToPage(
    page,
    {
      x: 40,
      y: 370,
      width: 18,
      height: 18,
    },
  );

  return new Uint8Array(
    await document.save(),
  );
}

describe(
  'PDF forms',
  () => {
    it(
      'inspects fields',
      async () => {
        const bytes =
          await createPdf();

        const result =
          await inspectPdfForm(
            bytes,
          );

        expect(
          result.fields.length,
        ).toBe(2);

        expect(
          result.fields[0]?.kind,
        ).toBe('text');

        expect(
          result.fields[1]?.kind,
        ).toBe('checkbox');
      },
    );

    it(
      'fills editable fields',
      async () => {
        const bytes =
          await createPdf();

        const output =
          await fillPdfForm(
            bytes,
            [
              {
                name: 'nome',
                value: 'Giuseppe',
              },
              {
                name: 'accetto',
                value: true,
              },
            ],
            {
              flatten: false,
            },
          );

        const document =
          await PDFDocument.load(
            output,
          );

        const form =
          document.getForm();

        expect(
          form
            .getTextField('nome')
            .getText(),
        ).toBe('Giuseppe');

        expect(
          form
            .getCheckBox('accetto')
            .isChecked(),
        ).toBe(true);
      },
    );

    it(
      'flattens the final form',
      async () => {
        const bytes =
          await createPdf();

        const output =
          await fillPdfForm(
            bytes,
            [],
            {
              flatten: true,
            },
          );

        const document =
          await PDFDocument.load(
            output,
          );

        expect(
          document
            .getForm()
            .getFields(),
        ).toHaveLength(0);
      },
    );
  },
);