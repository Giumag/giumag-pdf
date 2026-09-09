import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  BrowserPdfEngine,
  type PageNumberOptions,
  type PageNumberPosition,
} from '@giumag/pdf-engine';

import type {
  LoadedPdf,
} from '../lib/pdf';

import {
  formatBytes,
  loadPdfFile,
} from '../lib/pdf';

import {
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';

interface PageNumbersWorkspaceProps {
  onClose: () => void;
}

type PageNumberSettings =
  Required<PageNumberOptions>;

interface PageNumbersResult {
  bytes: Uint8Array;
  settings: PageNumberSettings;
  numberedPages: number;
}

interface PositionOption {
  id: PageNumberPosition;
  name: string;
  description: string;
}

const engine =
  new BrowserPdfEngine();

const DEFAULT_SETTINGS: PageNumberSettings = {
  position: 'bottom-center',
  firstPage: 1,
  startNumber: 1,
  fontSize: 11,
  margin: 24,
};

const POSITION_OPTIONS: PositionOption[] = [
  {
    id: 'bottom-left',
    name: 'In basso a sinistra',
    description:
      'Allinea il numero al margine sinistro.',
  },
  {
    id: 'bottom-center',
    name: 'In basso al centro',
    description:
      'Una posizione pulita e adatta alla maggior parte dei documenti.',
  },
  {
    id: 'bottom-right',
    name: 'In basso a destra',
    description:
      'Allinea il numero al margine destro.',
  },
];

function acceptsPdf(
  file: File,
) {
  return (
    file.type === 'application/pdf' ||
    file.name
      .toLowerCase()
      .endsWith('.pdf')
  );
}

function dataTransferHasFiles(
  dataTransfer: DataTransfer,
) {
  return Array
    .from(dataTransfer.types)
    .includes('Files');
}

function baseFileName(
  fileName: string,
) {
  const base =
    fileName
      .replace(/\.pdf$/i, '')
      .trim();

  return base || 'documento';
}

function downloadPdf(
  bytes: Uint8Array,
  fileName: string,
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
        type: 'application/pdf',
      },
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1500,
  );
}

function positionClass(
  position: PageNumberPosition,
) {
  switch (position) {
    case 'bottom-left':
      return 'is-left';

    case 'bottom-right':
      return 'is-right';

    default:
      return 'is-center';
  }
}

export function PageNumbersWorkspace({
  onClose,
}: PageNumbersWorkspaceProps) {
  const [pdf, setPdf] =
    useState<LoadedPdf | null>(
      null,
    );

  const [settings, setSettings] =
    useState<PageNumberSettings>(
      DEFAULT_SETTINGS,
    );

  const [result, setResult] =
    useState<PageNumbersResult | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [
    externalDragging,
    setExternalDragging,
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const pdfRef =
    useRef<LoadedPdf | null>(
      null,
    );

  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const current =
        pdfRef.current;

      if (current) {
        void current
          .document
          .loadingTask
          .destroy();
      }
    };
  }, []);

  function updateSettings(
    patch: Partial<PageNumberSettings>,
  ) {
    setSettings(
      (current) => ({
        ...current,
        ...patch,
      }),
    );

    setResult(null);
    setError(null);
  }

  async function openFile(
    file: File,
  ) {
    if (!acceptsPdf(file)) {
      setError(
        'Seleziona un documento PDF.',
      );

      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const loaded =
        await loadPdfFile(file);

      if (!mountedRef.current) {
        await loaded
          .document
          .loadingTask
          .destroy();

        return;
      }

      const previous =
        pdfRef.current;

      pdfRef.current =
        loaded;

      setPdf(loaded);

      setSettings({
        ...DEFAULT_SETTINGS,
        firstPage: 1,
      });

      if (previous) {
        await previous
          .document
          .loadingTask
          .destroy();
      }
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile aprire questo PDF.',
      );
    }
    finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  function openDroppedFiles(
    files: File[],
  ) {
    const file =
      files.find(
        acceptsPdf,
      );

    if (!file) {
      setError(
        'Trascina un documento PDF valido.',
      );

      return;
    }

    void openFile(file);
  }

  async function addNumbers() {
    const currentPdf =
      pdfRef.current;

    if (!currentPdf) {
      setError(
        'Apri un documento PDF prima di aggiungere i numeri.',
      );

      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const output =
        await engine.addPageNumbers(
          currentPdf.bytes,
          settings,
        );

      if (!mountedRef.current) {
        return;
      }

      setResult({
        bytes: output,
        settings: {
          ...settings,
        },
        numberedPages:
          currentPdf
            .document
            .numPages -
          settings.firstPage +
          1,
      });
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile aggiungere i numeri a questo PDF.',
      );
    }
    finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  function downloadResult() {
    if (!pdf || !result) {
      return;
    }

    downloadPdf(
      result.bytes,
      `${baseFileName(pdf.name)}-numerato.pdf`,
    );
  }

  const controlsDisabled =
    loading || busy;

  const pageCount =
    pdf?.document.numPages ?? 0;

  return (
    <main className="workspace-shell page-numbers-shell">
      <header className="workspace-topbar glass-surface">
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
            Numeri di pagina
          </strong>

          <span>
            <ShieldIcon />

            {pdf
              ? `Area di lavoro locale · ${pageCount} ${
                  pageCount === 1
                    ? 'pagina'
                    : 'pagine'
                }`
              : 'Area di lavoro locale'}
          </span>
        </div>

        <div className="topbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file =
                event
                  .currentTarget
                  .files?.[0];

              if (file) {
                void openFile(file);
              }

              event.currentTarget.value =
                '';
            }}
          />

          <button
            className="secondary-button compact-button"
            type="button"
            disabled={controlsDisabled}
            onClick={() =>
              fileInputRef
                .current
                ?.click()
            }
            aria-label={
              pdf
                ? 'Sostituisci PDF'
                : 'Scegli PDF'
            }
          >
            <ReplaceIcon />

            <span>
              {pdf
                ? 'Sostituisci PDF'
                : 'Scegli PDF'}
            </span>
          </button>
        </div>
      </header>

      <div
        className={`page-numbers-workspace ${
          externalDragging
            ? 'page-numbers-workspace-dragging'
            : ''
        }`}
        onDragEnter={(event) => {
          if (
            dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            event.preventDefault();

            setExternalDragging(
              true,
            );
          }
        }}
        onDragOver={(event) => {
          if (
            dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            event.preventDefault();

            event.dataTransfer.dropEffect =
              'copy';

            setExternalDragging(
              true,
            );
          }
        }}
        onDragLeave={(event) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            setExternalDragging(
              false,
            );
          }
        }}
        onDrop={(event) => {
          event.preventDefault();

          setExternalDragging(
            false,
          );

          openDroppedFiles(
            Array.from(
              event.dataTransfer.files,
            ),
          );
        }}
      >
        <div className="page-numbers-content">
          <section className="page-numbers-heading">
            <div>
              <p className="page-numbers-kicker">
                Numerazione locale
              </p>

              <h1 className="page-numbers-title">
                Aggiungi i numeri alle pagine.
              </h1>
            </div>

            <p className="page-numbers-description">
              Scegli la posizione e crea una copia numerata
              senza caricare il documento online.
            </p>
          </section>

          {!pdf ? (
            <section
              className={`page-numbers-dropzone ${
                externalDragging
                  ? 'is-dragging'
                  : ''
              }`}
            >
              <div className="page-numbers-empty-icon">
                <DocumentIcon />

                <span className="page-numbers-empty-badge">
                  <ToolIcon id="page-numbers" />
                </span>
              </div>

              <div className="page-numbers-empty-copy">
                <strong>
                  Apri il PDF da numerare
                </strong>

                <span>
                  Trascinalo qui oppure sceglilo dal dispositivo.
                </span>
              </div>

              <button
                className="primary-button"
                type="button"
                disabled={loading}
                onClick={() =>
                  fileInputRef
                    .current
                    ?.click()
                }
              >
                {loading
                  ? 'Apertura...'
                  : 'Scegli PDF'}
              </button>
            </section>
          ) : (
            <>
              <section className="page-numbers-document-card">
                <div className="page-numbers-document-icon">
                  <DocumentIcon />
                </div>

                <div className="page-numbers-document-copy">
                  <strong>
                    {pdf.name}
                  </strong>

                  <span>
                    {pageCount}{' '}
                    {pageCount === 1
                      ? 'pagina'
                      : 'pagine'}
                    {' · '}
                    {formatBytes(
                      pdf.size,
                    )}
                  </span>

                  <small>
                    Il file resta sul dispositivo.
                  </small>
                </div>

                <button
                  className="secondary-button compact-button"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() =>
                    fileInputRef
                      .current
                      ?.click()
                  }
                >
                  <ReplaceIcon />
                  Sostituisci
                </button>
              </section>

              <section className="page-numbers-settings">
                <div className="page-numbers-section-heading">
                  <div>
                    <p className="page-numbers-kicker">
                      Posizione
                    </p>

                    <h2>
                      Dove vuoi mettere i numeri?
                    </h2>
                  </div>

                  <span>
                    In basso al centro è la scelta consigliata.
                  </span>
                </div>

                <div className="page-numbers-position-grid">
                  {POSITION_OPTIONS.map(
                    (option) => {
                      const active =
                        settings.position ===
                        option.id;

                      return (
                        <button
                          className={`page-numbers-position-card ${
                            active
                              ? 'is-active'
                              : ''
                          }`}
                          key={option.id}
                          type="button"
                          disabled={controlsDisabled}
                          aria-pressed={active}
                          onClick={() =>
                            updateSettings({
                              position:
                                option.id,
                            })
                          }
                        >
                          <span className="page-numbers-position-preview">
                            <span
                              className={`page-numbers-preview-number ${positionClass(
                                option.id,
                              )}`}
                            >
                              1
                            </span>
                          </span>

                          <span className="page-numbers-position-copy">
                            <span className="ux-title-row">
                              <strong>
                                {option.name}
                              </strong>

                              {option.id ===
                                'bottom-center' ? (
                                <span className="ux-badge">
                                  Consigliato
                                </span>
                              ) : null}
                            </span>

                            <small>
                              {option.description}
                            </small>
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>

                <details className="ux-advanced page-numbers-advanced">
                  <summary>
                    <span>
                      <strong>
                        Impostazioni avanzate
                      </strong>

                      <small>
                        Pagina iniziale, numero iniziale,
                        dimensione e margine
                      </small>
                    </span>

                    <span
                      className="ux-advanced-chevron"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="ux-advanced-body">
                    <div className="page-numbers-fields-grid">
                      <label className="page-numbers-field">
                        <span>
                          Inizia dalla pagina
                        </span>

                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          step={1}
                          value={settings.firstPage}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              firstPage:
                                Number(
                                  event.target.value,
                                ),
                            })
                          }
                        />

                        <small>
                          Utile per lasciare una copertina senza numero.
                        </small>
                      </label>

                      <label className="page-numbers-field">
                        <span>
                          Primo numero
                        </span>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={settings.startNumber}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              startNumber:
                                Number(
                                  event.target.value,
                                ),
                            })
                          }
                        />

                        <small>
                          Il valore assegnato alla prima pagina numerata.
                        </small>
                      </label>

                      <label className="page-numbers-field">
                        <span>
                          Dimensione
                        </span>

                        <input
                          type="number"
                          min={6}
                          max={72}
                          step={1}
                          value={settings.fontSize}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              fontSize:
                                Number(
                                  event.target.value,
                                ),
                            })
                          }
                        />

                        <small>
                          11 è adatto alla maggior parte dei PDF.
                        </small>
                      </label>

                      <label className="page-numbers-field">
                        <span>
                          Distanza dal bordo
                        </span>

                        <input
                          type="number"
                          min={0}
                          max={144}
                          step={1}
                          value={settings.margin}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              margin:
                                Number(
                                  event.target.value,
                                ),
                            })
                          }
                        />

                        <small>
                          Valore in punti PDF. Consigliato: 24.
                        </small>
                      </label>
                    </div>

                    <button
                      className="ux-inline-action"
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() => {
                        setSettings({
                          ...DEFAULT_SETTINGS,
                        });

                        setResult(null);
                        setError(null);
                      }}
                    >
                      Ripristina consigliate
                    </button>
                  </div>
                </details>
              </section>

              <section className="page-numbers-action-panel">
                <div>
                  <p className="page-numbers-kicker">
                    Pronto
                  </p>

                  <h2>
                    Crea la copia numerata
                  </h2>

                  <p>
                    Verranno numerate{' '}
                    {Math.max(
                      0,
                      pageCount -
                        settings.firstPage +
                        1,
                    )}{' '}
                    {pageCount -
                      settings.firstPage +
                      1 ===
                    1
                      ? 'pagina'
                      : 'pagine'}.
                    Il PDF originale non viene modificato.
                  </p>
                </div>

                <button
                  className="primary-button page-numbers-main-action"
                  type="button"
                  disabled={controlsDisabled}
                  data-auto-advance-action="true"
                  onClick={() =>
                    void addNumbers()
                  }
                >
                  <ToolIcon id="page-numbers" />

                  <span>
                    {busy
                      ? 'Creazione...'
                      : 'Aggiungi numeri'}
                  </span>
                </button>
              </section>

              {error ? (
                <div className="page-numbers-message page-numbers-error">
                  {error}
                </div>
              ) : null}

              {result ? (
                <section
                  className="page-numbers-result"
                  data-auto-advance-target="true"
                >
                  <div>
                    <p className="page-numbers-kicker">
                      Completato
                    </p>

                    <h2>
                      PDF numerato
                    </h2>

                    <span>
                      {result.numberedPages}{' '}
                      {result.numberedPages === 1
                        ? 'pagina numerata'
                        : 'pagine numerate'}
                      {' · '}
                      {formatBytes(
                        result.bytes.byteLength,
                      )}
                    </span>
                  </div>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={downloadResult}
                  >
                    <DownloadIcon />

                    <span>
                      Scarica PDF
                    </span>
                  </button>
                </section>
              ) : null}

              <div className="page-numbers-privacy">
                <ShieldIcon />

                <span>
                  Elaborazione locale: il documento non viene
                  caricato su server esterni.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}