import {
  useRef,
  useState,
} from 'react';

import type {
  PdfFormFieldInfo,
  PdfFormFieldValue,
  PdfFormSummary,
  PdfFormValueUpdate,
} from '@giumag/pdf-engine';

import {
  fillPdfFormWorker,
  inspectPdfFormWorker,
} from '../lib/forms-pdf-worker';

import {
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';
import {
  WorkspaceHeader,
  WorkspaceIntro,
} from './ui/WorkspaceChrome';

interface FormsPdfWorkspaceProps {
  onClose: () => void;
}

interface FormsSource {
  file: File;
  bytes: Uint8Array;
  summary: PdfFormSummary;
}

function formatBytes(
  bytes: number,
) {
  if (
    bytes >=
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(
      bytes / 1024,
    )} KB`;
  }

  return `${bytes} B`;
}

function baseName(
  name: string,
) {
  return (
    name
      .replace(
        /\.pdf$/i,
        '',
      )
      .trim() ||
    'documento'
  );
}

function isEditable(
  field: PdfFormFieldInfo,
) {
  return (
    field.kind === 'text' ||
    field.kind === 'checkbox' ||
    field.kind === 'radio' ||
    field.kind === 'dropdown' ||
    field.kind === 'option-list'
  );
}

function fieldLabel(
  field: PdfFormFieldInfo,
) {
  switch (field.kind) {
    case 'text':
      return 'Testo';

    case 'checkbox':
      return 'Casella';

    case 'radio':
      return 'Scelta singola';

    case 'dropdown':
      return 'Menu';

    case 'option-list':
      return 'Lista';

    case 'button':
      return 'Pulsante';

    default:
      return 'Non supportato';
  }
}

function describeError(
  value: unknown,
) {
  if (
    value instanceof Error &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value.trim();
  }

  return 'Impossibile elaborare questo PDF.';
}

function downloadPdf(
  bytes: Uint8Array,
  name: string,
) {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(bytes);

  const blob =
    new Blob(
      [copy.buffer],
      {
        type:
          'application/pdf',
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      'a',
    );

  anchor.href = url;
  anchor.download = name;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        url,
      ),
    0,
  );
}

export function FormsPdfWorkspace({
  onClose,
}: FormsPdfWorkspaceProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    source,
    setSource,
  ] = useState<
    FormsSource | null
  >(null);

  const [
    values,
    setValues,
  ] = useState<
    Record<
      string,
      PdfFormFieldValue
    >
  >({});

  const [
    flatten,
    setFlatten,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<
    Uint8Array | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function openFile(
    file: File,
  ) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      if (
        !file.name
          .toLowerCase()
          .endsWith('.pdf') &&
        file.type !==
          'application/pdf'
      ) {
        throw new Error(
          'Scegli un file PDF.',
        );
      }

      const bytes =
        new Uint8Array(
          await file
            .arrayBuffer(),
        );

      if (
        bytes.byteLength ===
        0
      ) {
        throw new Error(
          'Il PDF è vuoto.',
        );
      }

      const summary =
        await inspectPdfFormWorker(
          bytes,
        );

      const initial:
        Record<
          string,
          PdfFormFieldValue
        > = {};

      for (
        const field
        of summary.fields
      ) {
        initial[field.name] =
          field.value;
      }

      setValues(initial);

      setSource({
        file,
        bytes,
        summary,
      });
    } catch (caught) {
      setSource(null);
      setValues({});

      setError(
        describeError(
          caught,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function updateValue(
    name: string,
    value: PdfFormFieldValue,
  ) {
    setValues(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );

    setResult(null);
    setError(null);
  }

  async function createPdf() {
    if (
      !source ||
      busy
    ) {
      return;
    }

    setBusy(true);
    setResult(null);
    setError(null);

    try {
      const updates:
        PdfFormValueUpdate[] =
        source.summary.fields
          .filter(
            (field) =>
              isEditable(
                field,
              ) &&
              !field.readOnly,
          )
          .map(
            (field) => ({
              name:
                field.name,
              value:
                values[
                  field.name
                ] ??
                field.value,
            }),
          );

      const output =
        await fillPdfFormWorker(
          source.bytes,
          updates,
          {
            flatten,
          },
        );

      setResult(output);
    } catch (caught) {
      setError(
        describeError(
          caught,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const editableCount =
    source?.summary.fields
      .filter(
        (field) =>
          isEditable(
            field,
          ) &&
          !field.readOnly,
      ).length ?? 0;

  const resultName =
    source
      ? `${baseName(
          source.file.name,
        )}-compilato.pdf`
      : 'documento-compilato.pdf';

  return (
    <main
      className="workspace-shell forms-shell"
      aria-busy={busy}
    >
      <input
        ref={inputRef}
        className="forms-file-input"
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => {
          const file =
            event
              .currentTarget
              .files?.[0];

          event.currentTarget.value =
            '';

          if (file) {
            void openFile(
              file,
            );
          }
        }}
      />

      <WorkspaceHeader empty={!source}>
        <button
          type="button"
          className="brand-button forms-brand"
          onClick={onClose}
          aria-label="Torna alla home"
        >
          <span className="brand-mark">
            G
          </span>

          <span>
            Giumag PDF
          </span>
        </button>

        {source && (
          <div className="document-title forms-document-title">
            <strong>
              Compila PDF
            </strong>

            <span>
              <ShieldIcon />
              Elaborazione sul dispositivo
            </span>
          </div>
        )}

        <div className="topbar-actions forms-topbar-actions">
          {source && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() =>
                inputRef.current
                  ?.click()
              }
            >
              <ReplaceIcon />
              <span>
                Sostituisci PDF
              </span>
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>
      </WorkspaceHeader>

      <div className="forms-content">
        <WorkspaceIntro
          eyebrow="Moduli PDF"
          title="Compila il tuo PDF"
          description="Modifica i campi presenti nel documento e crea una nuova copia direttamente sul dispositivo."
        />

        {!source ? (
          <section
            className={`forms-dropzone ${
              dragging
                ? 'is-dragging'
                : ''
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragLeave={(event) => {
              event.preventDefault();

              if (
                event.currentTarget ===
                event.target
              ) {
                setDragging(
                  false,
                );
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);

              const file =
                event.dataTransfer
                  .files?.[0];

              if (file) {
                void openFile(
                  file,
                );
              }
            }}
          >
            <span className="forms-empty-icon">
              <ToolIcon id="forms" />
            </span>

            <div className="forms-dropzone-copy">
              <strong>
                Scegli un PDF compilabile
              </strong>

              <span>
                Rilevo automaticamente testo,
                caselle, scelte, menu e liste.
              </span>
            </div>

            <button
              type="button"
              className="primary-button forms-choose-button"
              disabled={busy}
              onClick={() =>
                inputRef.current
                  ?.click()
              }
            >
              <DocumentIcon />

              <span>
                {busy
                  ? 'Apro il PDF…'
                  : 'Scegli PDF'}
              </span>
            </button>
          </section>
        ) : (
          <>
            <section className="forms-document-card">
              <span className="forms-document-icon">
                <DocumentIcon />
              </span>

              <div className="forms-document-copy">
                <strong title={source.file.name}>
                  {source.file.name}
                </strong>

                <span>
                  {formatBytes(
                    source.file.size,
                  )}
                  {' · '}
                  {source.summary.pageCount}{' '}
                  {source.summary.pageCount === 1
                    ? 'pagina'
                    : 'pagine'}
                </span>
              </div>

              <div className="forms-document-stat">
                <strong>
                  {source.summary.fields.length}
                </strong>
                <span>
                  campi
                </span>
              </div>
            </section>

            {source.summary.hasXfa && (
              <div className="forms-message forms-warning">
                Il PDF contiene anche dati XFA.
                Mostro i campi AcroForm compatibili.
              </div>
            )}

            {source.summary.fields.length === 0 ? (
              <div
                className="forms-message forms-error"
                role="alert"
              >
                Questo PDF non contiene campi
                compilabili compatibili.
              </div>
            ) : (
              <>
                <section className="forms-fields-panel">
                  <div className="forms-section-heading">
                    <div>
                      <p className="forms-kicker">
                        CAMPI
                      </p>

                      <h2>
                        Compila il documento
                      </h2>
                    </div>

                    <span>
                      {editableCount}{' '}
                      modificabili
                    </span>
                  </div>

                  <div className="forms-field-list">
                    {source.summary.fields.map(
                      (field) => {
                        const value =
                          values[
                            field.name
                          ] ??
                          field.value;

                        const disabled =
                          busy ||
                          field.readOnly ||
                          !isEditable(
                            field,
                          );

                        return (
                          <div
                            key={field.name}
                            className="forms-field-card"
                          >
                            <div className="forms-field-label">
                              <strong>
                                {field.name}
                              </strong>

                              <span>
                                {fieldLabel(
                                  field,
                                )}
                                {field.required
                                  ? ' · obbligatorio'
                                  : ''}
                                {field.readOnly
                                  ? ' · sola lettura'
                                  : ''}
                              </span>
                            </div>

                            {field.kind === 'text' &&
                              (field.multiline ? (
                                <textarea
                                  rows={3}
                                  value={
                                    typeof value ===
                                    'string'
                                      ? value
                                      : ''
                                  }
                                  maxLength={
                                    field.maxLength
                                  }
                                  disabled={disabled}
                                  onChange={(event) =>
                                    updateValue(
                                      field.name,
                                      event
                                        .currentTarget
                                        .value,
                                    )
                                  }
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={
                                    typeof value ===
                                    'string'
                                      ? value
                                      : ''
                                  }
                                  maxLength={
                                    field.maxLength
                                  }
                                  disabled={disabled}
                                  onChange={(event) =>
                                    updateValue(
                                      field.name,
                                      event
                                        .currentTarget
                                        .value,
                                    )
                                  }
                                />
                              ))}

                            {field.kind === 'checkbox' && (
                              <label className="forms-check-control">
                                <input
                                  type="checkbox"
                                  checked={
                                    value === true
                                  }
                                  disabled={disabled}
                                  onChange={(event) =>
                                    updateValue(
                                      field.name,
                                      event
                                        .currentTarget
                                        .checked,
                                    )
                                  }
                                />

                                <span>
                                  Selezionato
                                </span>
                              </label>
                            )}

                            {(field.kind === 'radio' ||
                              field.kind === 'dropdown') && (
                              <select
                                value={
                                  typeof value ===
                                  'string'
                                    ? value
                                    : ''
                                }
                                disabled={disabled}
                                onChange={(event) =>
                                  updateValue(
                                    field.name,
                                    event
                                      .currentTarget
                                      .value,
                                  )
                                }
                              >
                                <option value="">
                                  Nessuna selezione
                                </option>

                                {field.options.map(
                                  (option) => (
                                    <option
                                      key={option}
                                      value={option}
                                    >
                                      {option}
                                    </option>
                                  ),
                                )}
                              </select>
                            )}

                            {field.kind === 'option-list' && (
                              <select
                                multiple
                                value={
                                  Array.isArray(
                                    value,
                                  )
                                    ? value
                                    : []
                                }
                                disabled={disabled}
                                onChange={(event) => {
                                  const selected =
                                    Array.from(
                                      event
                                        .currentTarget
                                        .selectedOptions,
                                    ).map(
                                      (option) =>
                                        option.value,
                                    );

                                  updateValue(
                                    field.name,
                                    selected,
                                  );
                                }}
                              >
                                {field.options.map(
                                  (option) => (
                                    <option
                                      key={option}
                                      value={option}
                                    >
                                      {option}
                                    </option>
                                  ),
                                )}
                              </select>
                            )}

                            {(field.kind === 'button' ||
                              field.kind === 'unknown') && (
                              <span className="forms-unsupported">
                                Nessun valore da compilare.
                              </span>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>

                <section className="forms-output-card">
                  <div>
                    <p className="forms-kicker">
                      OUTPUT
                    </p>

                    <h2>
                      Crea la copia compilata
                    </h2>
                  </div>

                  <label className="forms-flatten-option">
                    <input
                      type="checkbox"
                      checked={flatten}
                      disabled={busy}
                      onChange={(event) => {
                        setFlatten(
                          event.currentTarget
                            .checked,
                        );

                        setResult(null);
                      }}
                    />

                    <span>
                      <strong>
                        Rendi definitivo
                      </strong>

                      <small>
                        I campi non saranno più modificabili.
                      </small>
                    </span>
                  </label>

                  <button
                    type="button"
                    className="primary-button forms-create-button"
                    disabled={
                      busy ||
                      editableCount === 0
                    }
                    data-auto-advance-action="true"
                    onClick={() =>
                      void createPdf()
                    }
                  >
                    <ToolIcon id="forms" />

                    <span>
                      {busy
                        ? 'Creo il PDF…'
                        : 'Crea PDF'}
                    </span>
                  </button>
                </section>
              </>
            )}

            {error && (
              <div
                className="forms-message forms-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {result && (
              <section
                className="forms-result-card"
                data-auto-advance-target="true"
                aria-live="polite"
              >
                <div>
                  <p className="forms-kicker">
                    COMPLETATO
                  </p>

                  <h2>
                    PDF compilato pronto
                  </h2>

                  <span>
                    {flatten
                      ? 'Campi resi definitivi.'
                      : 'Campi ancora modificabili.'}
                  </span>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    downloadPdf(
                      result,
                      resultName,
                    )
                  }
                >
                  <DownloadIcon />

                  <span>
                    Scarica PDF
                  </span>
                </button>
              </section>
            )}

            <div className="forms-privacy">
              <ShieldIcon />
              <span>
                Documento e valori restano sul dispositivo.
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}