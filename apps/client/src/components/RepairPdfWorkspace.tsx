import {
  useRef,
  useState,
  type DragEvent,
} from 'react';

import {
  formatBytes,
} from '../lib/pdf';

import {
  repairPdfInWorker,
} from '../lib/repair-pdf-worker';

import {
  DocumentIcon,
  ReplaceIcon,
  ShieldIcon,
} from './Icons';

interface RepairPdfWorkspaceProps {
  onClose: () => void;
}

interface RepairResult {
  bytes: Uint8Array;
  size: number;
}

function acceptsPdf(
  file: File,
) {
  return (
    file.type ===
      'application/pdf' ||
    file.name
      .toLowerCase()
      .endsWith('.pdf')
  );
}

function repairedFileName(
  originalName: string,
) {
  const base =
    originalName.replace(
      /\.pdf$/i,
      '',
    );

  return `${base}-riparato.pdf`;
}

function toArrayBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const buffer =
    new ArrayBuffer(
      bytes.byteLength,
    );

  new Uint8Array(
    buffer,
  ).set(bytes);

  return buffer;
}

function downloadPdf(
  bytes: Uint8Array,
  fileName: string,
) {
  const blob =
    new Blob(
      [
        toArrayBuffer(
          bytes,
        ),
      ],
      {
        type: 'application/pdf',
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
  anchor.download = fileName;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      );
    },
    1500,
  );
}

export function RepairPdfWorkspace({
  onClose,
}: RepairPdfWorkspaceProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [file, setFile] =
    useState<File | null>(
      null,
    );

  const [bytes, setBytes] =
    useState<Uint8Array | null>(
      null,
    );

  const [dragActive, setDragActive] =
    useState(false);

  const [repairing, setRepairing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [result, setResult] =
    useState<RepairResult | null>(
      null,
    );

  const selectFile = async (
    nextFile: File,
  ) => {
    if (!acceptsPdf(nextFile)) {
      setError(
        'Seleziona un file PDF.',
      );

      return;
    }

    try {
      const nextBytes =
        new Uint8Array(
          await nextFile.arrayBuffer(),
        );

      if (
        nextBytes.byteLength === 0
      ) {
        throw new Error(
          'Il file selezionato è vuoto.',
        );
      }

      setFile(nextFile);
      setBytes(nextBytes);
      setResult(null);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile leggere il PDF.',
      );
    }
  };

  const replaceFile = () => {
    if (repairing) {
      return;
    }

    inputRef.current?.click();
  };

  const handleDrop = (
    event:
      DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    setDragActive(false);

    if (repairing) {
      return;
    }

    const dropped =
      event.dataTransfer.files?.[0];

    if (dropped) {
      void selectFile(
        dropped,
      );
    }
  };

  const repair = async () => {
    if (
      !file ||
      !bytes ||
      repairing
    ) {
      return;
    }

    setRepairing(true);
    setError(null);
    setResult(null);

    try {
      const repaired =
        await repairPdfInWorker(
          bytes,
        );

      const nextResult = {
        bytes: repaired,
        size:
          repaired.byteLength,
      };

      setResult(
        nextResult,
      );

      downloadPdf(
        repaired,
        repairedFileName(
          file.name,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile riparare il PDF.',
      );
    } finally {
      setRepairing(false);
    }
  };

  return (
    <section
      className="workspace-shell repair-shell"
      aria-busy={repairing}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          const selected =
            event.target.files?.[0];

          if (selected) {
            void selectFile(
              selected,
            );
          }

          event.currentTarget.value =
            '';
        }}
      />

      <header className="workspace-topbar glass-surface repair-topbar">
        <button
          className="brand-button"
          type="button"
          onClick={onClose}
          aria-label="Torna alla home di Giumag PDF"
        >
          <span className="brand-mark">
            G
          </span>

          <span>
            Giumag PDF
          </span>
        </button>

        <div className="document-title">
          <strong>
            Ripara PDF
          </strong>

          <span>
            <ShieldIcon />
            Riparazione strutturale locale
          </span>
        </div>

        <div className="topbar-actions">
          {file ? (
            <>
              <button
                type="button"
                className="secondary-button compact-button"
                disabled={repairing}
                onClick={
                  replaceFile
                }
              >
                <ReplaceIcon />
                Sostituisci
              </button>

              <button
                type="button"
                className="primary-button compact-button"
                disabled={
                  repairing ||
                  !bytes
                }
                onClick={() => {
                  void repair();
                }}
              >
                {repairing
                  ? 'Riparazione…'
                  : 'Ripara PDF'}
              </button>
            </>
          ) : (
            <span
              className="repair-topbar-placeholder"
              aria-hidden="true"
            />
          )}
        </div>
      </header>

      <main className="repair-main">
        <section className="repair-hero">
          <span className="repair-eyebrow">
            RIPARA PDF
          </span>

          <h1>
            Prova a recuperare un PDF danneggiato.
          </h1>

          <p>
            Giumag PDF riscrive la struttura del documento
            e prova a ricostruire riferimenti e tabelle interne
            danneggiate, senza caricare il file online.
          </p>
        </section>

        <div className="repair-local-note">
          <ShieldIcon />

          <div>
            <strong>
              Elaborazione completamente locale
            </strong>

            <span>
              Il motore qpdf tenta di recuperare i problemi
              strutturali riparabili. Un file gravemente corrotto
              può comunque non essere recuperabile.
            </span>
          </div>
        </div>

        {error ? (
          <div
            className="repair-message repair-message-error"
            role="alert"
          >
            <strong>
              Riparazione non completata
            </strong>

            <span>
              {error}
            </span>
          </div>
        ) : null}

        {!file ? (
          <div
            className={
              dragActive
                ? 'repair-dropzone is-dragging'
                : 'repair-dropzone'
            }
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();

              if (
                event.currentTarget ===
                event.target
              ) {
                setDragActive(false);
              }
            }}
            onDrop={handleDrop}
            onClick={() => {
              inputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault();

                inputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="repair-dropzone-icon">
              <DocumentIcon />
            </div>

            <div className="repair-dropzone-copy">
              <span className="repair-dropzone-label">
                PDF DA RIPARARE
              </span>

              <h2>
                Trascina qui il PDF danneggiato
              </h2>

              <p>
                oppure selezionalo dal dispositivo
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={(event) => {
                event.stopPropagation();

                inputRef.current?.click();
              }}
            >
              Scegli PDF
            </button>
          </div>
        ) : (
          <div className="repair-file-card">
            <div className="repair-file-icon">
              <DocumentIcon />
            </div>

            <div className="repair-file-copy">
              <span className="repair-file-label">
                PDF SELEZIONATO
              </span>

              <strong>
                {file.name}
              </strong>

              <small>
                {formatBytes(
                  file.size,
                )}
              </small>
            </div>

            <div className="repair-file-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={repairing}
                onClick={
                  replaceFile
                }
              >
                Sostituisci
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={
                  repairing ||
                  !bytes
                }
                onClick={() => {
                  void repair();
                }}
              >
                {repairing
                  ? 'Riparazione in corso…'
                  : 'Ripara e scarica'}
              </button>
            </div>
          </div>
        )}

        {repairing ? (
          <div className="repair-progress-card">
            <div className="repair-progress-heading">
              <div>
                <strong>
                  Analisi e ricostruzione in corso
                </strong>

                <span>
                  qpdf sta riscrivendo la struttura del documento.
                </span>
              </div>

              <span>
                Attendi…
              </span>
            </div>

            <div className="repair-progress-track">
              <div className="repair-progress-bar" />
            </div>
          </div>
        ) : null}

        {result && file ? (
          <div className="repair-message repair-message-success">
            <div>
              <strong>
                PDF riscritto correttamente
              </strong>

              <span>
                Il download è partito automaticamente.
                Risultato: {formatBytes(result.size)}.
              </span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                downloadPdf(
                  result.bytes,
                  repairedFileName(
                    file.name,
                  ),
                );
              }}
            >
              Scarica di nuovo
            </button>
          </div>
        ) : null}

        <section className="repair-explanation">
          <div>
            <span className="repair-explanation-number">
              1
            </span>

            <strong>
              Legge la struttura
            </strong>

            <p>
              qpdf analizza oggetti, riferimenti e cross-reference
              table del documento.
            </p>
          </div>

          <div>
            <span className="repair-explanation-number">
              2
            </span>

            <strong>
              Ricostruisce ciò che può
            </strong>

            <p>
              Le incongruenze strutturali recuperabili vengono
              corrette durante la riscrittura.
            </p>
          </div>

          <div>
            <span className="repair-explanation-number">
              3
            </span>

            <strong>
              Crea un nuovo PDF
            </strong>

            <p>
              Il risultato viene scaricato come file separato,
              senza sovrascrivere l’originale.
            </p>
          </div>
        </section>
      </main>
    </section>
  );
}