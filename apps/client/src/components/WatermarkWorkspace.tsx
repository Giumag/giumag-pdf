import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  BrowserPdfEngine,
  type TextWatermarkOptions,
  type WatermarkPosition,
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

import {
  WorkspaceHeader,
  WorkspaceIntro,
} from './ui/WorkspaceChrome';

interface WatermarkWorkspaceProps {
  onClose: () => void;
}

interface WatermarkSettings {
  position: WatermarkPosition;
  fontSize: number;
  opacity: number;
  rotation: number;
  margin: number;
  firstPage: number;
  lastPage: number;
}

interface WatermarkResult {
  bytes: Uint8Array;
  text: string;
  settings: WatermarkSettings;
  affectedPages: number;
}

const engine =
  new BrowserPdfEngine();

const DEFAULT_TEXT =
  'RISERVATO';

const DEFAULT_SETTINGS: WatermarkSettings = {
  position: 'center',
  fontSize: 48,
  opacity: 0.18,
  rotation: -35,
  margin: 32,
  firstPage: 1,
  lastPage: 1,
};

const POSITION_OPTIONS: Array<{
  id: WatermarkPosition;
  label: string;
}> = [
  {
    id: 'center',
    label: 'Al centro',
  },
  {
    id: 'top-left',
    label: 'In alto a sinistra',
  },
  {
    id: 'top-right',
    label: 'In alto a destra',
  },
  {
    id: 'bottom-left',
    label: 'In basso a sinistra',
  },
  {
    id: 'bottom-right',
    label: 'In basso a destra',
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
    () => URL.revokeObjectURL(url),
    1500,
  );
}

export function WatermarkWorkspace({
  onClose,
}: WatermarkWorkspaceProps) {
  const [pdf, setPdf] =
    useState<LoadedPdf | null>(
      null,
    );

  const [text, setText] =
    useState(DEFAULT_TEXT);

  const [settings, setSettings] =
    useState<WatermarkSettings>(
      DEFAULT_SETTINGS,
    );

  const [result, setResult] =
    useState<WatermarkResult | null>(
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
    patch: Partial<WatermarkSettings>,
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

  function resetRecommended() {
    const pageCount =
      pdf?.document.numPages ?? 1;

    setText(DEFAULT_TEXT);

    setSettings({
      ...DEFAULT_SETTINGS,
      lastPage: pageCount,
    });

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

      setText(DEFAULT_TEXT);

      setSettings({
        ...DEFAULT_SETTINGS,
        firstPage: 1,
        lastPage:
          loaded.document.numPages,
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

  async function createWatermark() {
    const currentPdf =
      pdfRef.current;

    if (!currentPdf) {
      setError(
        'Apri un documento PDF prima di aggiungere la filigrana.',
      );

      return;
    }

    const trimmedText =
      text.trim();

    if (!trimmedText) {
      setError(
        'Scrivi il testo della filigrana.',
      );

      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    const options: TextWatermarkOptions = {
      text: trimmedText,
      ...settings,
    };

    try {
      const output =
        await engine.addTextWatermark(
          currentPdf.bytes,
          options,
        );

      if (!mountedRef.current) {
        return;
      }

      setResult({
        bytes: output,
        text: trimmedText,
        settings: {
          ...settings,
        },
        affectedPages:
          settings.lastPage -
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
          : 'Impossibile aggiungere la filigrana.',
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
      `${baseFileName(pdf.name)}-filigrana.pdf`,
    );
  }

  const pageCount =
    pdf?.document.numPages ?? 0;

  const controlsDisabled =
    loading || busy;

  const recommended =
    text === DEFAULT_TEXT &&
    settings.position === 'center' &&
    settings.fontSize === 48 &&
    settings.opacity === 0.18 &&
    settings.rotation === -35 &&
    settings.margin === 32 &&
    settings.firstPage === 1 &&
    settings.lastPage === pageCount;

  return (
    <main className="workspace-shell watermark-shell">
            <WorkspaceHeader empty={!pdf}>
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

        {pdf ? (
          <div className="document-title">
            <strong>
              Filigrana
            </strong>

            <span>
              <ShieldIcon />

              {pageCount}{' '}
              {pageCount === 1
                ? 'pagina'
                : 'pagine'}
              {' · locale'}
            </span>
          </div>
        ) : null}

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

          {!pdf ? (
            <button
              className="secondary-button coherence-close-button"
              type="button"
              onClick={onClose}
            >
              Chiudi
            </button>
          ) : (
            <>
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
                <span>
                  Sostituisci PDF
                </span>
              </button>

              <button
                className="primary-button compact-button"
                type="button"
                disabled={controlsDisabled}
                onClick={() =>
                  void createWatermark()
                }
              >
                <ToolIcon id="watermark" />

                <span>
                  {busy
                    ? 'Creazione...'
                    : 'Aggiungi filigrana'}
                </span>
              </button>
            </>
          )}
        </div>
      </WorkspaceHeader>

      <div
        className={`watermark-workspace ${
          externalDragging
            ? 'watermark-workspace-dragging'
            : ''
        }`}
        onDragEnter={(event) => {
          if (
            dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            event.preventDefault();
            setExternalDragging(true);
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
            setExternalDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            setExternalDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setExternalDragging(false);

          openDroppedFiles(
            Array.from(
              event.dataTransfer.files,
            ),
          );
        }}
      >
        <div className="watermark-content">
                    <WorkspaceIntro
            eyebrow="Filigrana"
            title="Aggiungi una filigrana al PDF"
            description="Aggiungi una scritta visibile alle pagine e regola posizione, dimensione e opacità. Il documento resta sul dispositivo."
          />

          {!pdf ? (
            <section
              className={`watermark-dropzone ${
                externalDragging
                  ? 'is-dragging'
                  : ''
              }`}
            >
              <div className="watermark-empty-icon">
                <DocumentIcon />

                <span className="watermark-empty-badge">
                  <ToolIcon id="watermark" />
                </span>
              </div>

              <div className="watermark-empty-copy">
                <strong>
                  Apri il PDF
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
              <section className="watermark-document-card">
                <div className="watermark-document-icon">
                  <DocumentIcon />
                </div>

                <div className="watermark-document-copy">
                  <strong>
                    {pdf.name}
                  </strong>

                  <span>
                    {pageCount}{' '}
                    {pageCount === 1
                      ? 'pagina'
                      : 'pagine'}
                    {' · '}
                    {formatBytes(pdf.size)}
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

              <section className="watermark-settings">
                <div className="watermark-section-heading">
                  <div>
                    <p className="watermark-kicker">
                      Testo
                    </p>

                    <h2>
                      Cosa vuoi scrivere?
                    </h2>
                  </div>

                  <span>
                    Puoi usare fino a 120 caratteri.
                  </span>
                </div>

                <label className="watermark-text-field">
                  <span className="visually-hidden">
                    Testo della filigrana
                  </span>

                  <input
                    type="text"
                    maxLength={120}
                    value={text}
                    disabled={controlsDisabled}
                    placeholder="Es. RISERVATO"
                    onChange={(event) => {
                      setText(
                        event.target.value,
                      );

                      setResult(null);
                      setError(null);
                    }}
                  />
                </label>

                <div
                  className={`ux-recommended-card watermark-preview-card ${
                    recommended
                      ? ''
                      : 'is-custom'
                  }`}
                >
                  <span
                    className={`ux-badge ${
                      recommended
                        ? ''
                        : 'is-neutral'
                    }`}
                  >
                    {recommended
                      ? 'Consigliato'
                      : 'Personalizzato'}
                  </span>

                  <strong>
                    Anteprima indicativa
                  </strong>

                  <div className="watermark-paper-preview">
                    <span
                      style={{
                        opacity:
                          settings.opacity,
                        transform:
                          `translate(-50%, -50%) rotate(${settings.rotation}deg)`,
                        fontSize:
                          `${Math.max(
                            12,
                            Math.min(
                              28,
                              settings.fontSize / 2.2,
                            ),
                          )}px`,
                      }}
                    >
                      {text.trim() ||
                        'FILIGRANA'}
                    </span>
                  </div>

                  <span>
                    Centro diagonale con una presenza visibile
                    ma non invasiva.
                  </span>
                </div>

                <details className="ux-advanced watermark-advanced">
                  <summary>
                    <span>
                      <strong>
                        Impostazioni avanzate
                      </strong>

                      <small>
                        Posizione, intensità, rotazione e pagine
                      </small>
                    </span>

                    <span
                      className="ux-advanced-chevron"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="ux-advanced-body">
                    <div className="watermark-fields-grid">
                      <label className="watermark-field">
                        <span>
                          Posizione
                        </span>

                        <select
                          value={settings.position}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              position:
                                event.target
                                  .value as WatermarkPosition,
                            })
                          }
                        >
                          {POSITION_OPTIONS.map(
                            (option) => (
                              <option
                                key={option.id}
                                value={option.id}
                              >
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label className="watermark-field">
                        <span>
                          Dimensione
                        </span>

                        <input
                          type="number"
                          min={12}
                          max={144}
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
                          Consigliato: 48
                        </small>
                      </label>

                      <label className="watermark-field">
                        <span>
                          Opacità
                        </span>

                        <div className="watermark-range-row">
                          <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={
                              settings.opacity *
                              100
                            }
                            disabled={controlsDisabled}
                            onChange={(event) =>
                              updateSettings({
                                opacity:
                                  Number(
                                    event.target.value,
                                  ) / 100,
                              })
                            }
                          />

                          <strong>
                            {Math.round(
                              settings.opacity *
                                100,
                            )}
                            %
                          </strong>
                        </div>
                      </label>

                      <label className="watermark-field">
                        <span>
                          Rotazione
                        </span>

                        <input
                          type="number"
                          min={-180}
                          max={180}
                          step={1}
                          value={settings.rotation}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              rotation:
                                Number(
                                  event.target.value,
                                ),
                            })
                          }
                        />

                        <small>
                          -35° crea il classico effetto diagonale.
                        </small>
                      </label>

                      <label className="watermark-field">
                        <span>
                          Dalla pagina
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
                      </label>

                      <label className="watermark-field">
                        <span>
                          Alla pagina
                        </span>

                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          step={1}
                          value={settings.lastPage}
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            updateSettings({
                              lastPage:
                                Number(
                                  event.target.value,
                                ),
                            })
                          }
                        />
                      </label>

                      <label className="watermark-field">
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
                          Usata quando la filigrana non è al centro.
                        </small>
                      </label>
                    </div>

                    <button
                      className="ux-inline-action"
                      type="button"
                      disabled={controlsDisabled}
                      onClick={resetRecommended}
                    >
                      Ripristina consigliate
                    </button>
                  </div>
                </details>
              </section>

              <section className="watermark-action-panel">
                <div>
                  <p className="watermark-kicker">
                    Pronto
                  </p>

                  <h2>
                    Crea il PDF con filigrana
                  </h2>

                  <p>
                    La filigrana verrà aggiunta a{' '}
                    {Math.max(
                      0,
                      settings.lastPage -
                        settings.firstPage +
                        1,
                    )}{' '}
                    {settings.lastPage -
                      settings.firstPage +
                      1 ===
                    1
                      ? 'pagina'
                      : 'pagine'}.
                    L'originale resta invariato.
                  </p>
                </div>

                <button
                  className="primary-button watermark-main-action"
                  type="button"
                  disabled={controlsDisabled}
                  data-auto-advance-action="true"
                  onClick={() =>
                    void createWatermark()
                  }
                >
                  <ToolIcon id="watermark" />

                  <span>
                    {busy
                      ? 'Creazione...'
                      : 'Aggiungi filigrana'}
                  </span>
                </button>
              </section>

              {error ? (
                <div className="watermark-message watermark-error">
                  {error}
                </div>
              ) : null}

              {result ? (
                <section
                  className="watermark-result"
                  data-auto-advance-target="true"
                >
                  <div>
                    <p className="watermark-kicker">
                      Completato
                    </p>

                    <h2>
                      PDF con filigrana
                    </h2>

                    <span>
                      {result.affectedPages}{' '}
                      {result.affectedPages === 1
                        ? 'pagina modificata'
                        : 'pagine modificate'}
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

              <div className="watermark-privacy">
                <ShieldIcon />

                <span>
                  Elaborazione locale: il PDF non viene
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