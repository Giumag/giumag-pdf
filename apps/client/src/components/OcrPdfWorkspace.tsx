import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  OcrPdfProcessor,
  type OcrLanguage,
  type OcrPdfProgress,
  type OcrPdfResult,
} from '../lib/ocr-pdf';

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

interface OcrPdfWorkspaceProps {
  onClose: () => void;
}

interface OcrSource {
  file: File;
  bytes: Uint8Array;
}

const LANGUAGE_OPTIONS:
  Array<{
    id: OcrLanguage;
    title: string;
    description: string;
  }> = [
    {
      id: 'ita',
      title: 'Italiano',
      description:
        'Documenti principalmente in italiano',
    },
    {
      id: 'eng',
      title: 'Inglese',
      description:
        'Documenti principalmente in inglese',
    },
    {
      id: 'ita+eng',
      title: 'Italiano + inglese',
      description:
        'Documenti con entrambe le lingue',
    },
  ];

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

function safeBaseFileName(
  name: string,
) {
  const base =
    name.replace(
      /\.pdf$/i,
      '',
    );

  return (
    base.trim() ||
    'documento'
  );
}

function progressText(
  progress:
    OcrPdfProgress,
) {
  if (
    progress.phase ===
    'rendering'
  ) {
    if (
      progress.completed ===
      0
    ) {
      return 'Preparo le pagine per il riconoscimento…';
    }

    return `Preparazione pagina ${Math.min(
      progress.completed,
      progress.total,
    )} di ${progress.total}`;
  }

  if (
    progress.phase ===
    'building'
  ) {
    return 'Creo il PDF ricercabile…';
  }

  if (
    progress.completed ===
      0 &&
    progress.pageProgress ===
      0
  ) {
    return 'Carico il motore OCR locale…';
  }

  return `Riconoscimento pagina ${Math.min(
    progress.completed + 1,
    progress.total,
  )} di ${progress.total}`;
}

function downloadPdf(
  bytes: Uint8Array,
  name: string,
) {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(
    bytes,
  );

  const blob =
    new Blob(
      [
        copy.buffer,
      ],
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

function describeWorkspaceError(
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

  if (
    value &&
    typeof value === 'object' &&
    'message' in value
  ) {
    const message =
      String(
        (
          value as {
            message?: unknown;
          }
        ).message ?? '',
      ).trim();

    if (message) {
      return message;
    }
  }

  try {
    const serialized =
      JSON.stringify(
        value,
      );

    if (
      serialized &&
      serialized !== '{}'
    ) {
      return serialized;
    }
  } catch {
    // Valore non serializzabile.
  }

  const text =
    String(
      value,
    ).trim();

  if (
    text &&
    text !==
      '[object Object]'
  ) {
    return text;
  }

  return 'Errore OCR sconosciuto.';
}
export function OcrPdfWorkspace({
  onClose,
}: OcrPdfWorkspaceProps) {
  const [
    source,
    setSource,
  ] = useState<
    OcrSource | null
  >(null);

  const [
    language,
    setLanguage,
  ] = useState<
    OcrLanguage
  >('ita');

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState<
    OcrPdfProgress | null
  >(null);

  const [
    result,
    setResult,
  ] = useState<
    OcrPdfResult | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const processorRef =
    useRef<
      OcrPdfProcessor | null
    >(null);

  const mountedRef =
    useRef(true);

  useEffect(() => {
    /*
     * React Strict Mode esegue un ciclo
     * setup -> cleanup -> setup aggiuntivo
     * in sviluppo.
     *
     * Il ref deve quindi essere riattivato
     * ad ogni setup dell'effect.
     */
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      processorRef.current
        ?.cancel();
    };
  }, []);

  async function openFile(
    file: File,
  ) {
    if (busy) {
      return;
    }

    setError(null);
    setResult(null);
    setProgress(null);

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

      const signature =
        new TextDecoder(
          'ascii',
        ).decode(
          bytes.subarray(
            0,
            Math.min(
              bytes.length,
              1024,
            ),
          ),
        );

      if (
        !signature.includes(
          '%PDF-',
        )
      ) {
        throw new Error(
          'Il file selezionato non sembra essere un PDF valido.',
        );
      }

      setSource({
        file,
        bytes,
      });
    } catch (caught) {
      setSource(null);

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile aprire questo PDF.',
      );
    }
  }

  async function startOcr() {
    if (
      !source ||
      busy
    ) {
      return;
    }

    processorRef.current
      ?.cancel();

    const processor =
      new OcrPdfProcessor();

    processorRef.current =
      processor;

    setBusy(true);
    setResult(null);
    setError(null);

    setProgress({
      phase:
        'rendering',
      completed: 0,
      total: 1,
      pageIndex: 0,
      pageProgress: 0,
      percent: 0,
    });

    try {
      const next =
        await processor.process(
          source.bytes,
          language,
          {
            onProgress:
              (value) => {
                if (
                  mountedRef.current &&
                  processorRef.current ===
                    processor
                ) {
                  setProgress(
                    value,
                  );
                }
              },
          },
        );

      if (
        !mountedRef.current ||
        processorRef.current !==
          processor
      ) {
        return;
      }

      setResult(
        next,
      );

      setProgress(null);
    } catch (caught) {
      if (
        !mountedRef.current ||
        processorRef.current !==
          processor
      ) {
        return;
      }

      setProgress(null);

      const detail =
        describeWorkspaceError(
          caught,
        );

      console.error(
        '[Giumag OCR] Elaborazione fallita:',
        caught,
      );

      setError(
        detail,
      );
    } finally {
      if (
        mountedRef.current &&
        processorRef.current ===
          processor
      ) {
        processorRef.current =
          null;

        setBusy(false);
      }
    }
  }

  function closeWorkspace() {
    processorRef.current
      ?.cancel();

    processorRef.current =
      null;

    onClose();
  }

  const resultName =
    source
      ? `${safeBaseFileName(
          source.file.name,
        )}-ocr.pdf`
      : 'documento-ocr.pdf';

  return (
    <main
      className="workspace-shell ocr-shell"
      aria-busy={busy}
    >
      <input
        ref={inputRef}
        className="ocr-file-input"
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => {
          const file =
            event.currentTarget
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
          className="brand-button"
          onClick={closeWorkspace}
          aria-label="Torna alla home di Giumag PDF"
        >
          <span className="brand-mark">
            G
          </span>

          <span>
            Giumag PDF
          </span>
        </button>

        {source ? (
          <div className="document-title">
            <strong>
              OCR PDF
            </strong>

            <span>
              <ShieldIcon />
              {formatBytes(source.file.size)} · locale
            </span>
          </div>
        ) : null}

        <div className="topbar-actions">
          {!source ? (
            <button
              type="button"
              className="secondary-button coherence-close-button"
              onClick={closeWorkspace}
            >
              Chiudi
            </button>
          ) : (
            <>
              <button
                type="button"
                className="secondary-button compact-button"
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

              <button
                type="button"
                className="primary-button compact-button"
                disabled={busy}
                onClick={() =>
                  void startOcr()
                }
              >
                <ToolIcon id="ocr" />

                <span>
                  {busy
                    ? 'OCR in corso…'
                    : 'Avvia OCR'}
                </span>
              </button>
            </>
          )}
        </div>
      </WorkspaceHeader>

      <div className="ocr-content">
                <WorkspaceIntro
          eyebrow="OCR PDF"
          title="Rendi il PDF ricercabile"
          description="Riconosce il testo nelle scansioni e crea una copia ricercabile direttamente sul dispositivo."
        />

        {!source ? (
          <section
            className={`ocr-dropzone ${
              dragging
                ? 'is-dragging'
                : ''
            }`}
            onDragEnter={(event) => {
              event.preventDefault();

              if (!busy) {
                setDragging(
                  true,
                );
              }
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

              if (busy) {
                return;
              }

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
            <span className="ocr-empty-icon">
              <ToolIcon id="ocr" />
            </span>

            <div className="ocr-dropzone-copy">
              <strong>
                Scegli un PDF scansionato
              </strong>

              <span>
                Trascinalo qui oppure selezionalo
                dal dispositivo.
              </span>
            </div>

            <button
              type="button"
              className="primary-button ocr-choose-button"
              disabled={busy}
              onClick={() =>
                inputRef.current
                  ?.click()
              }
            >
              <DocumentIcon />
              <span>
                Scegli PDF
              </span>
            </button>
          </section>
        ) : (
          <>
            <section className="ocr-document-card">
              <span className="ocr-document-icon">
                <DocumentIcon />
              </span>

              <div>
                <strong title={source.file.name}>
                  {source.file.name}
                </strong>

                <span>
                  {formatBytes(
                    source.file.size,
                  )}
                  {' · '}
                  Elaborazione locale
                </span>
              </div>
            </section>

            <section className="ocr-language-card">
              <div className="ocr-section-heading">
                <p className="ocr-kicker">
                  Lingua
                </p>

                <h2>
                  Che lingua contiene il documento?
                </h2>

                <span>
                  Una scelta corretta migliora sensibilmente
                  il riconoscimento.
                </span>
              </div>

              <div className="ocr-language-grid">
                {LANGUAGE_OPTIONS.map(
                  (option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`ocr-language-option ${
                        language ===
                        option.id
                          ? 'is-active'
                          : ''
                      }`}
                      disabled={busy}
                      aria-pressed={
                        language ===
                        option.id
                      }
                      onClick={() => {
                        setLanguage(
                          option.id,
                        );

                        setResult(
                          null,
                        );

                        setError(
                          null,
                        );
                      }}
                    >
                      <strong>
                        {option.title}
                      </strong>

                      <span>
                        {option.description}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="ocr-action-card">
              <div>
                <p className="ocr-kicker">
                  Riconoscimento
                </p>

                <h2>
                  Crea il PDF ricercabile
                </h2>

                <span>
                  Le pagine vengono analizzate sul dispositivo.
                  Nessun documento viene caricato online.
                </span>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={busy}
                data-auto-advance-action="true"
                onClick={() =>
                  void startOcr()
                }
              >
                <ToolIcon id="ocr" />

                <span>
                  {busy
                    ? 'OCR in corso…'
                    : 'Avvia OCR'}
                </span>
              </button>
            </section>

            {progress && (
              <section
                className="ocr-progress-card"
                aria-live="polite"
              >
                <div className="ocr-progress-copy">
                  <strong>
                    {progressText(
                      progress,
                    )}
                  </strong>

                  <span>
                    {Math.max(
                      0,
                      Math.min(
                        100,
                        progress.percent,
                      ),
                    )}
                    %
                  </span>
                </div>

                <div
                  className="ocr-progress-track"
                  role="progressbar"
                  aria-label="Avanzamento OCR"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    progress.percent
                  }
                >
                  <span
                    style={{
                      width:
                        `${progress.percent}%`,
                    }}
                  />
                </div>
              </section>
            )}

            {error && (
              <div
                className="ocr-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {result && (
              <section
                className="ocr-result-card"
                data-auto-advance-target="true"
                aria-live="polite"
              >
                <div>
                  <p className="ocr-kicker">
                    Completato
                  </p>

                  <h2>
                    PDF ricercabile pronto
                  </h2>

                  <span>
                    {result.pages}{' '}
                    {result.pages === 1
                      ? 'pagina'
                      : 'pagine'}
                    {' · '}
                    {result.words.toLocaleString(
                      'it-IT',
                    )}{' '}
                    parole riconosciute
                    {result.confidence >
                    0
                      ? ` · ${result.confidence}% confidenza media`
                      : ''}
                  </span>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    downloadPdf(
                      result.bytes,
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

            <div className="ocr-privacy">
              <ShieldIcon />

              <span>
                OCR, immagini e PDF restano sul dispositivo.
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
