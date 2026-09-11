import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFField,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib';

export type PdfFormFieldKind =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'option-list'
  | 'button'
  | 'unknown';

export type PdfFormFieldValue =
  | string
  | boolean
  | string[];

export interface PdfFormFieldInfo {
  name: string;
  kind: PdfFormFieldKind;
  value: PdfFormFieldValue;
  options: string[];
  readOnly: boolean;
  required: boolean;
  multiline: boolean;
  maxLength?: number;
}

export interface PdfFormSummary {
  fields: PdfFormFieldInfo[];
  pageCount: number;
  hasXfa: boolean;
}

export interface PdfFormValueUpdate {
  name: string;
  value: PdfFormFieldValue;
}

export interface FillPdfFormOptions {
  flatten?: boolean;
}

function describeField(
  field: PDFField,
): PdfFormFieldInfo {
  const common = {
    name: field.getName(),
    options: [] as string[],
    readOnly: field.isReadOnly(),
    required: field.isRequired(),
    multiline: false,
  };

  if (field instanceof PDFTextField) {
    return {
      ...common,
      kind: 'text',
      value: field.getText() ?? '',
      multiline: field.isMultiline(),
      maxLength: field.getMaxLength(),
    };
  }

  if (field instanceof PDFCheckBox) {
    return {
      ...common,
      kind: 'checkbox',
      value: field.isChecked(),
    };
  }

  if (field instanceof PDFRadioGroup) {
    return {
      ...common,
      kind: 'radio',
      value: field.getSelected() ?? '',
      options: field.getOptions(),
    };
  }

  if (field instanceof PDFDropdown) {
    return {
      ...common,
      kind: 'dropdown',
      value: field.getSelected()[0] ?? '',
      options: field.getOptions(),
    };
  }

  if (field instanceof PDFOptionList) {
    return {
      ...common,
      kind: 'option-list',
      value: field.getSelected(),
      options: field.getOptions(),
    };
  }

  if (field instanceof PDFButton) {
    return {
      ...common,
      kind: 'button',
      value: '',
    };
  }

  return {
    ...common,
    kind: 'unknown',
    value: '',
  };
}

export async function inspectPdfForm(
  bytes: Uint8Array,
): Promise<PdfFormSummary> {
  const document =
    await PDFDocument.load(
      bytes,
      {
        updateMetadata: false,
      },
    );

  const form =
    document.getForm();

  return {
    fields:
      form
        .getFields()
        .map(describeField),
    pageCount:
      document.getPageCount(),
    hasXfa:
      form.hasXFA(),
  };
}

export async function fillPdfForm(
  bytes: Uint8Array,
  updates: PdfFormValueUpdate[],
  options: FillPdfFormOptions = {},
): Promise<Uint8Array> {
  const document =
    await PDFDocument.load(
      bytes,
      {
        updateMetadata: false,
      },
    );

  const form =
    document.getForm();

  const fields =
    new Map(
      form
        .getFields()
        .map(
          (field) =>
            [
              field.getName(),
              field,
            ] as const,
        ),
    );

  for (const update of updates) {
    const field =
      fields.get(
        update.name,
      );

    if (
      !field ||
      field.isReadOnly()
    ) {
      continue;
    }

    if (field instanceof PDFTextField) {
      if (
        typeof update.value ===
        'string'
      ) {
        field.setText(
          update.value,
        );
      }

      continue;
    }

    if (field instanceof PDFCheckBox) {
      if (update.value === true) {
        field.check();
      } else {
        field.uncheck();
      }

      continue;
    }

    if (field instanceof PDFRadioGroup) {
      if (
        typeof update.value ===
          'string' &&
        update.value.length > 0
      ) {
        field.select(
          update.value,
        );
      } else {
        field.clear();
      }

      continue;
    }

    if (field instanceof PDFDropdown) {
      if (
        typeof update.value ===
          'string' &&
        update.value.length > 0
      ) {
        field.select(
          update.value,
        );
      } else {
        field.clear();
      }

      continue;
    }

    if (field instanceof PDFOptionList) {
      if (
        Array.isArray(
          update.value,
        ) &&
        update.value.length > 0
      ) {
        field.select(
          update.value,
        );
      } else {
        field.clear();
      }
    }
  }

  if (options.flatten ?? true) {
    form.flatten({
      updateFieldAppearances:
        true,
    });
  } else {
    form.updateFieldAppearances();
  }

  return new Uint8Array(
    await document.save({
      useObjectStreams: true,
    }),
  );
}