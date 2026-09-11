import { useEffect, useRef, useState } from 'react';
import type { CompressionPreset } from '@giumag/pdf-engine';
import type { LoadedPdf } from '../lib/pdf';
import { formatBytes, loadPdfFile } from '../lib/pdf';
import { CompressionWorkerClient } from '../lib/compress-worker';
import {
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';

interface CompressPdfWorkspaceProps {
  onClose: () => void;
}

interface CompressionResult {
  bytes: Uint8Array;
  size: number;
  preset: CompressionPreset;
}

type CompressionResults =
  Partial<Record<CompressionPreset, CompressionResult>>;

interface PresetOption {
  id: CompressionPreset;
  name: string;
  description: string;
  detail: string;
}

const PRESETS: PresetOption[] = [
  {
    id: 'light',
    name: 'Qualità migliore',
    description:
      'Mantiene al massimo la qualità e prova a ridurre il peso senza cambiamenti visivi evidenti.',
    detail: 'Meno riduzione',
  },
  {
    id: 'recommended',
    name: 'Equilibrata',
    description:
      'Riduce il peso mantenendo una buona qualità per documenti, testo e immagini.',
    detail: 'Qualità e peso',
  },
  {
    id: 'strong',
    name: 'File più piccolo',
    description:
      'Riduce maggiormente le immagini quando la priorità è ottenere un PDF più leggero.',
    detail: 'Più riduzione',
  },
];

function acceptsPdf(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

function dataTransferHasFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes('Files');
}

function baseFileName(fileName: string) {
  const base = fileName
    .replace(/\.pdf$/i, '')
    .trim();

  return base || 'documento';
}

function downloadPdf(
  bytes: Uint8Array,
  fileName: string,
) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  const blob = new Blob(
    [copy.buffer],
    { type: 'application/pdf' },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

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

function reductionPercent(
  originalSize: number,
  outputSize: number,
) {
  if (originalSize <= 0) {
    return 0;
  }

  return (
    (originalSize - outputSize) /
    originalSize
  ) * 100;
}

function deltaLabel(
  originalSize: number,
  outputSize: number,
) {
  const percent = reductionPercent(
    originalSize,
    outputSize,
  );

  if (percent > 0.05) {
    return `-${percent.toFixed(1)}%`;
  }

  if (percent < -0.05) {
    return `+${Math.abs(percent).toFixed(1)}%`;
  }

  return '0%';
}

function presetName(preset: CompressionPreset) {
  return (
    PRESETS.find(
      (option) => option.id === preset,
    )?.name ?? preset
  );
}

export function CompressPdfWorkspace({
  onClose,
}: CompressPdfWorkspaceProps) {
  const [pdf, setPdf] =
    useState<LoadedPdf | null>(null);

  const [preset, setPreset] =
    useState<CompressionPreset>('recommended');

  const [results, setResults] =
    useState<CompressionResults>({});

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const [externalDragging, setExternalDragging] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const pdfRef =
    useRef<LoadedPdf | null>(null);

  const workerRef =
    useRef<CompressionWorkerClient | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      workerRef.current?.terminate();
      workerRef.current = null;

      const current = pdfRef.current;

      if (current) {
        void current.document.loadingTask.destroy();
      }
    };
  }, []);

  function getWorker() {
    if (!workerRef.current) {
      workerRef.current =
        new CompressionWorkerClient();
    }

    return workerRef.current;
  }

  async function openFile(file: File) {
    if (!acceptsPdf(file)) {
      setError('Seleziona un documento PDF.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);
    setResults({});

    try {
      const loaded = await loadPdfFile(file);

      if (!mountedRef.current) {
        await loaded.document.loadingTask.destroy();
        return;
      }

      const previous = pdfRef.current;

      pdfRef.current = loaded;

      setPdf(loaded);
      setPreset('recommended');

      if (previous) {
        await previous.document.loadingTask.destroy();
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile aprire questo PDF.',
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  function openDroppedFiles(files: File[]) {
    const file = files.find(acceptsPdf);

    if (!file) {
      setError('Trascina un documento PDF valido.');
      return;
    }

    void openFile(file);
  }

  async function compressPdf() {
    const currentPdf = pdfRef.current;

    if (!currentPdf) {
      setError(
        'Apri un documento PDF prima di comprimerlo.',
      );

      return;
    }

    const selectedPreset = preset;

    setBusy(true);
    setError(null);
    setStatusMessage(null);

    try {
      const bytes = await getWorker().compress(
        currentPdf.bytes,
        selectedPreset,
      );

      if (!mountedRef.current) {
        return;
      }

      const nextResult: CompressionResult = {
        bytes,
        size: bytes.byteLength,
        preset: selectedPreset,
      };

      setResults((current) => ({
        ...current,
        [selectedPreset]: nextResult,
      }));

      const percent = reductionPercent(
        currentPdf.size,
        bytes.byteLength,
      );

      const name = presetName(selectedPreset);

      if (percent > 0.05) {
        setStatusMessage(
          `${name}: ${percent.toFixed(1)}% in meno rispetto all'originale.`,
        );
      } else if (percent < -0.05) {
        setStatusMessage(
          `${name}: il PDF era già ottimizzato e il risultato è ${Math.abs(percent).toFixed(1)}% più grande.`,
        );
      } else {
        setStatusMessage(
          `${name}: dimensione praticamente invariata.`,
        );
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile comprimere questo documento PDF.',
      );
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  const activeResult = results[preset] ?? null;

  function downloadResult() {
    if (!pdf || !activeResult) {
      return;
    }

    downloadPdf(
      activeResult.bytes,
      `${baseFileName(pdf.name)}-compresso-${activeResult.preset}.pdf`,
    );
  }

  const controlsDisabled = loading || busy;
  const pageCount = pdf?.document.numPages ?? 0;
  const measuredPresetCount = Object.keys(results).length;

  return (
    <main className="workspace-shell compress-shell">
      <header
        className={`workspace-topbar glass-surface coherence-topbar${!pdf ? ' is-empty' : ''}`}
      >
        <button
          className="brand-button"
          type="button"
          onClick={onClose}
          aria-label="Torna alla home di Giumag PDF"
        >
          <span className="brand-mark">G</span>
          <span>Giumag PDF</span>
        </button>

        {pdf && (
<div className="document-title">
          <strong>Comprimi PDF</strong>

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
        )}

        <div className="topbar-actions">
<input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file =
                event.currentTarget.files?.[0];

              if (file) {
                void openFile(file);
              }

              event.currentTarget.value = '';
            }}
          />

          {!pdf ? (
            <button
              type="button"
              className="secondary-button coherence-close-button"
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
              fileInputRef.current?.click()
            }
          >
            <ReplaceIcon />

            <span>
              {pdf
                ? 'Sostituisci PDF'
                : 'Scegli PDF'}
            </span>
          </button>

          <button
            className="primary-button compact-button"
            type="button"
            disabled={controlsDisabled || !pdf}
            onClick={() => void compressPdf()}
          >
            <ToolIcon id="compress" />

            <span>
              {busy
                ? 'Compressione...'
                : activeResult
                  ? 'Ricalcola'
                  : 'Comprimi'}
            </span>
          </button>
            </>
          )}
        </div>
      </header>

      <div
        className={[
          'compress-workspace',
          !pdf
            ? 'ui-empty-workspace'
            : '',
          externalDragging
            ? 'compress-workspace-dragging'
            : '',
        ].filter(Boolean).join(' ')}
        onDragEnter={(event) => {
          if (
            !dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            return;
          }

          event.preventDefault();
          setExternalDragging(true);
        }}
        onDragOver={(event) => {
          if (
            !dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setExternalDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            event.currentTarget === event.target
          ) {
            setExternalDragging(false);
          }
        }}
        onDrop={(event) => {
          if (
            !dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            return;
          }

          event.preventDefault();
          setExternalDragging(false);

          openDroppedFiles(
            Array.from(
              event.dataTransfer.files,
            ),
          );
        }}
      >
        <div className="compress-content">
          <section className="compress-heading">
            <div>
              <p className="compress-kicker">
                Comprimi PDF
              </p>

              <h1 className="compress-title">
                Comprimi il tuo PDF
              </h1>
            </div>

            <p className="compress-description">
                            Scegli il livello di compressione e confronta
              la riduzione realmente ottenuta sul documento.
            </p>
          </section>

          {!pdf ? (
            <section
              className={[
                'compress-empty-dropzone',
                externalDragging
                  ? 'is-dragging'
                  : '',
              ].filter(Boolean).join(' ')}
              aria-label="Apri un documento PDF da comprimere"
            >
              <div
                className="compress-empty-icon"
                aria-hidden="true"
              >
                <DocumentIcon />

                <span className="compress-empty-badge">
                  <ToolIcon id="compress" />
                </span>
              </div>

              <div className="compress-empty-copy">
                <strong>
                  {loading
                    ? 'Apertura documento...'
                    : 'Trascina qui un PDF'}
                </strong>

                <span>
                  Il documento viene aperto,
                  analizzato e compresso interamente
                  sul dispositivo.
                </span>
              </div>

              <button
                className="primary-button"
                type="button"
                disabled={loading}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                {loading
                  ? 'Apertura...'
                  : 'Scegli PDF'}
              </button>
            </section>
          ) : (
            <>
              <section className="compress-document-card">
                <div className="compress-document-icon">
                  <DocumentIcon />
                </div>

                <div className="compress-document-copy">
                  <strong title={pdf.name}>
                    {pdf.name}
                  </strong>

                  <span>
                    {pageCount}
                    {' '}
                    {pageCount === 1
                      ? 'pagina'
                      : 'pagine'}
                    {' · '}
                    {formatBytes(pdf.size)}
                  </span>

                  <small>
                    Elaborazione locale,
                    nessun caricamento
                  </small>
                </div>

                <button
                  className="secondary-button compact-button"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <ReplaceIcon />
                  <span>Sostituisci</span>
                </button>
              </section>

              <section
                className="compress-preset-section"
                aria-labelledby="compress-preset-title"
              >
                <div className="compress-section-heading">
                  <div>
                    <p className="compress-kicker">
                      Scegli il risultato
                    </p>

                    <h2 id="compress-preset-title">
                      Quanto vuoi ridurre il PDF?
                    </h2>

                    <p className="ux-panel-intro">
                      Se non sai quale scegliere,
                      usa “Equilibrata”.
                    </p>
                  </div>

                  <span>
                    {measuredPresetCount > 0
                      ? `${measuredPresetCount} ${
                          measuredPresetCount === 1
                            ? 'risultato confrontato'
                            : 'risultati confrontati'
                        }`
                      : 'Equilibrata è consigliata'}
                  </span>
                </div>

                <div
                  className="compress-preset-grid"
                  role="radiogroup"
                  aria-label="Livello di compressione"
                >
                  {PRESETS.map((option) => {
                    const cachedResult =
                      results[option.id];

                    return (
                      <button
                        key={option.id}
                        className={[
                          'compress-preset-card',
                          preset === option.id
                            ? 'is-active'
                            : '',
                          cachedResult
                            ? 'is-measured'
                            : '',
                        ].filter(Boolean).join(' ')}
                        type="button"
                        role="radio"
                        aria-checked={
                          preset === option.id
                        }
                        disabled={controlsDisabled}
                        onClick={() => {
                          setPreset(option.id);
                          setError(null);
                          setStatusMessage(null);
                        }}
                      >
                        <span className="compress-preset-topline">
                          <span className="ux-title-row">
                            <strong>
                              {option.name}
                            </strong>

                            {option.id === 'recommended' && (
                              <em className="ux-badge">
                                Consigliato
                              </em>
                            )}
                          </span>

                          <small
                            className={
                              cachedResult
                                ? 'is-calculated'
                                : undefined
                            }
                          >
                            {cachedResult
                              ? deltaLabel(
                                  pdf.size,
                                  cachedResult.size,
                                )
                              : option.detail}
                          </small>
                        </span>

                        <span className="compress-preset-description">
                          {option.description}
                        </span>

                        <span className="compress-preset-result">
                          {cachedResult
                            ? `${formatBytes(
                                cachedResult.size,
                              )} · risultato reale`
                            : 'Percentuale calcolata dopo la prova'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="compress-action-panel">
                <div>
                  <p className="compress-kicker">
                    {activeResult
                      ? 'Risultato disponibile'
                      : 'Pronto'}
                  </p>

                  <h2>
                    {busy
                      ? 'Sto comprimendo il PDF...'
                      : activeResult
                        ? 'Vuoi provare di nuovo?'
                        : `Comprimi con “${presetName(preset)}”`}
                  </h2>

                  <p>
                    Il risultato reale viene mostrato
                    prima del download, così puoi
                    confrontare peso e qualità.
                  </p>
                </div>

                <button
                  className="primary-button compress-main-action"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() =>
                    void compressPdf()
                  }
                >
                  <ToolIcon id="compress" />

                  <span>
                    {busy
                      ? 'Compressione...'
                      : activeResult
                        ? 'Ricalcola'
                        : 'Comprimi PDF'}
                  </span>
                </button>
              </section>

              {activeResult && (
                <section
                  className="compress-result-section"
                  aria-labelledby="compress-result-title"
                >
                  <div className="compress-section-heading">
                    <div>
                      <p className="compress-kicker">
                        Risultato reale
                      </p>

                      <h2 id="compress-result-title">
                        {presetName(activeResult.preset)}
                      </h2>
                    </div>

                    <span>
                      Misurato sul documento corrente
                    </span>
                  </div>

                  <div className="compress-stats-grid">
                    <div className="compress-stat-card">
                      <span>Originale</span>

                      <strong>
                        {formatBytes(pdf.size)}
                      </strong>
                    </div>

                    <div className="compress-stat-card">
                      <span>Compresso</span>

                      <strong>
                        {formatBytes(
                          activeResult.size,
                        )}
                      </strong>
                    </div>

                    <div
                      className={[
                        'compress-stat-card',
                        'compress-stat-highlight',
                        activeResult.size > pdf.size
                          ? 'is-negative'
                          : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <span>Variazione reale</span>

                      <strong>
                        {deltaLabel(
                          pdf.size,
                          activeResult.size,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="compress-result-actions">
                    <div>
                      <strong>
                        {activeResult.size < pdf.size
                          ? `${formatBytes(
                              pdf.size -
                                activeResult.size,
                            )} risparmiati`
                          : activeResult.size > pdf.size
                            ? `${formatBytes(
                                activeResult.size -
                                  pdf.size,
                              )} in più`
                            : 'Dimensione invariata'}
                      </strong>

                      <span>
                        Gli altri livelli già
                        calcolati restano disponibili
                        nelle card sopra.
                      </span>
                    </div>

                    <button
                      className="primary-button compact-button"
                      type="button"
                      onClick={downloadResult}
                    >
                      <DownloadIcon />
                      <span>Scarica PDF</span>
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {error && (
            <div
              className="compress-message compress-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {statusMessage && (
            <div
              className="compress-message compress-success"
              role="status"
            >
              {statusMessage}
            </div>
          )}

          <div className="compress-privacy-note">
            <ShieldIcon />

            <span>
              Nessun caricamento. Tutta
              l'elaborazione avviene sul dispositivo.
              La riduzione dipende dal contenuto del
              PDF e da quanto il file originale è
              già ottimizzato.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}