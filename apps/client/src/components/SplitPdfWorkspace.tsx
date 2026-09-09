import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BrowserPdfEngine,
  PageTransform,
} from '@giumag/pdf-engine';
import type { LoadedPdf } from '../lib/pdf';
import { formatBytes, loadPdfFile } from '../lib/pdf';
import {
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';
import { SplitPdfPagePreview } from './SplitPdfPagePreview';

interface SplitPdfWorkspaceProps {
  onClose: () => void;
}

type SplitMode = 'ranges' | 'pages';

interface SplitOutput {
  id: string;
  start: number;
  end: number;
  pageIndexes: number[];
  label: string;
  fileName: string;
}

interface SplitPlan {
  outputs: SplitOutput[];
  error: string | null;
}

let pdfEnginePromise: Promise<BrowserPdfEngine> | null = null;

function getPdfEngine(): Promise<BrowserPdfEngine> {
  if (!pdfEnginePromise) {
    pdfEnginePromise = import('@giumag/pdf-engine').then(
      ({ BrowserPdfEngine }) => new BrowserPdfEngine(),
    );
  }

  return pdfEnginePromise;
}

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

function downloadPdf(bytes: Uint8Array, fileName: string) {
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

function outputPageLabel(start: number, end: number) {
  if (start === end) {
    return `Pagina ${start}`;
  }

  return `Pagine ${start}–${end}`;
}

function outputFileName(
  baseName: string,
  index: number,
  totalOutputs: number,
  start: number,
  end: number,
) {
  const width = Math.max(
    2,
    String(totalOutputs).length,
  );

  const partNumber = String(index + 1).padStart(
    width,
    '0',
  );

  if (start === end) {
    return `${baseName}-parte-${partNumber}-pagina-${start}.pdf`;
  }

  return `${baseName}-parte-${partNumber}-pagine-${start}-${end}.pdf`;
}

function parseCustomRanges(
  value: string,
  pageCount: number,
  baseName: string,
): SplitPlan {
  const normalized = value.trim();

  if (!normalized) {
    return {
      outputs: [],
      error: 'Inserisci almeno una pagina o un intervallo.',
    };
  }

  const rawTokens = normalized.split(',');

  if (rawTokens.some((token) => token.trim().length === 0)) {
    return {
      outputs: [],
      error: 'Controlla le virgole: è presente un intervallo vuoto.',
    };
  }

  const parsed: Array<{
    start: number;
    end: number;
  }> = [];

  for (const rawToken of rawTokens) {
    const token = rawToken.trim();

    const match = token.match(
      /^(\d+)(?:\s*-\s*(\d+))?$/,
    );

    if (!match) {
      return {
        outputs: [],
        error: `Intervallo non valido: "${token}". Usa ad esempio 1-3, 4-6, 8.`,
      };
    }

    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < 1
    ) {
      return {
        outputs: [],
        error: 'I numeri di pagina devono partire da 1.',
      };
    }

    if (start > end) {
      return {
        outputs: [],
        error: `Intervallo invertito: ${start}-${end}.`,
      };
    }

    if (start > pageCount || end > pageCount) {
      return {
        outputs: [],
        error: `Il documento contiene ${pageCount} ${pageCount === 1 ? 'pagina' : 'pagine'}.`,
      };
    }

    parsed.push({
      start,
      end,
    });
  }

  const outputs = parsed.map(
    ({ start, end }, index): SplitOutput => ({
      id: `range-${index}-${start}-${end}`,
      start,
      end,
      pageIndexes: Array.from(
        { length: end - start + 1 },
        (_, offset) => start - 1 + offset,
      ),
      label: outputPageLabel(start, end),
      fileName: outputFileName(
        baseName,
        index,
        parsed.length,
        start,
        end,
      ),
    }),
  );

  return {
    outputs,
    error: null,
  };
}

function buildSinglePageOutputs(
  pageCount: number,
  baseName: string,
): SplitOutput[] {
  const width = Math.max(
    2,
    String(pageCount).length,
  );

  return Array.from(
    { length: pageCount },
    (_, index): SplitOutput => {
      const pageNumber = index + 1;
      const padded = String(pageNumber).padStart(
        width,
        '0',
      );

      return {
        id: `page-${pageNumber}`,
        start: pageNumber,
        end: pageNumber,
        pageIndexes: [index],
        label: `Pagina ${pageNumber}`,
        fileName: `${baseName}-pagina-${padded}.pdf`,
      };
    },
  );
}

function transformsForOutput(
  output: SplitOutput,
): PageTransform[] {
  return output.pageIndexes.map(
    (sourceIndex) => ({
      sourceIndex,
      rotation: 0,
    }),
  );
}

export function SplitPdfWorkspace({
  onClose,
}: SplitPdfWorkspaceProps) {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [rangeInput, setRangeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [externalDragging, setExternalDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<LoadedPdf | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const current = pdfRef.current;

      if (current) {
        void current.document.loadingTask.destroy();
      }
    };
  }, []);

  const pageCount = pdf?.document.numPages ?? 0;
  const documentBaseName = pdf
    ? baseFileName(pdf.name)
    : 'documento';

  const splitPlan = useMemo<SplitPlan>(() => {
    if (!pdf) {
      return {
        outputs: [],
        error: null,
      };
    }

    if (mode === 'pages') {
      return {
        outputs: buildSinglePageOutputs(
          pdf.document.numPages,
          documentBaseName,
        ),
        error: null,
      };
    }

    return parseCustomRanges(
      rangeInput,
      pdf.document.numPages,
      documentBaseName,
    );
  }, [
    documentBaseName,
    mode,
    pdf,
    rangeInput,
  ]);

  const pageNumbers = useMemo(
    () => (
      pdf
        ? Array.from(
            { length: pdf.document.numPages },
            (_, index) => index + 1,
          )
        : []
    ),
    [pdf],
  );

  async function openFile(file: File) {
    if (!acceptsPdf(file)) {
      setError('Seleziona un documento PDF.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const loaded = await loadPdfFile(file);

      if (!mountedRef.current) {
        await loaded.document.loadingTask.destroy();
        return;
      }

      const previous = pdfRef.current;

      pdfRef.current = loaded;
      setPdf(loaded);
      setMode('ranges');

      setRangeInput(
        loaded.document.numPages === 1
          ? '1'
          : `1-${loaded.document.numPages}`,
      );

      if (previous) {
        await previous.document.loadingTask.destroy();
      }

      if (mountedRef.current) {
        setStatusMessage('Documento aperto localmente.');
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

  async function exportOutput(output: SplitOutput) {
    const currentPdf = pdfRef.current;

    if (!currentPdf) {
      setError('Apri un documento PDF prima di esportare.');
      return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);

    try {
      const engine = await getPdfEngine();

      const bytes = await engine.extract(
        currentPdf.bytes,
        transformsForOutput(output),
      );

      downloadPdf(
        bytes,
        output.fileName,
      );

      if (mountedRef.current) {
        setStatusMessage(
          `${output.label} esportata localmente.`,
        );
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile esportare questo intervallo.',
      );
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  async function exportAll() {
    const currentPdf = pdfRef.current;

    if (!currentPdf) {
      setError('Apri un documento PDF prima di dividerlo.');
      return;
    }

    if (splitPlan.error) {
      setError(splitPlan.error);
      return;
    }

    if (splitPlan.outputs.length === 0) {
      setError('Non ci sono PDF da esportare.');
      return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);

    try {
      const engine = await getPdfEngine();

      for (
        let index = 0;
        index < splitPlan.outputs.length;
        index += 1
      ) {
        const output = splitPlan.outputs[index];

        const bytes = await engine.extract(
          currentPdf.bytes,
          transformsForOutput(output),
        );

        downloadPdf(
          bytes,
          output.fileName,
        );

        if (splitPlan.outputs.length > 1) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 120);
          });
        }
      }

      if (mountedRef.current) {
        setStatusMessage(
          `${splitPlan.outputs.length} ${
            splitPlan.outputs.length === 1
              ? 'PDF esportato'
              : 'PDF esportati'
          } localmente.`,
        );
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile dividere questo documento PDF.',
      );
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  const controlsDisabled = loading || busy;
  const planError = pdf ? splitPlan.error : null;

  return (
    <main className="workspace-shell split-shell">
      <header className="workspace-topbar glass-surface">
        <button
          className="brand-button"
          type="button"
          onClick={onClose}
          aria-label="Torna alla home di Giumag PDF"
        >
          <span className="brand-mark">G</span>
          <span>Giumag PDF</span>
        </button>

        <div className="document-title">
          <strong>Dividi PDF</strong>

          <span>
            <ShieldIcon />
            {pdf
              ? `Area di lavoro locale · ${pageCount} ${pageCount === 1 ? 'pagina' : 'pagine'}`
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
              const file = event.currentTarget.files?.[0];

              if (file) {
                void openFile(file);
              }

              event.currentTarget.value = '';
            }}
          />

          <button
            className="secondary-button compact-button"
            type="button"
            disabled={controlsDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ReplaceIcon />
            <span>{pdf ? 'Sostituisci PDF' : 'Scegli PDF'}</span>
          </button>

          <button
            className="primary-button compact-button"
            type="button"
            disabled={
              controlsDisabled ||
              !pdf ||
              Boolean(planError) ||
              splitPlan.outputs.length === 0
            }
            onClick={() => void exportAll()}
          >
            <DownloadIcon />
            <span>
              {busy ? 'Divisione...' : 'Dividi PDF'}
            </span>
          </button>
        </div>
      </header>

      <div
        className={[
          'split-workspace',
          externalDragging ? 'split-workspace-dragging' : '',
        ].filter(Boolean).join(' ')}
        onDragEnter={(event) => {
          if (!dataTransferHasFiles(event.dataTransfer)) {
            return;
          }

          event.preventDefault();
          setExternalDragging(true);
        }}
        onDragOver={(event) => {
          if (!dataTransferHasFiles(event.dataTransfer)) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setExternalDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) {
            setExternalDragging(false);
          }
        }}
        onDrop={(event) => {
          if (!dataTransferHasFiles(event.dataTransfer)) {
            return;
          }

          event.preventDefault();
          setExternalDragging(false);

          openDroppedFiles(
            Array.from(event.dataTransfer.files),
          );
        }}
      >
        <div className="split-content">
          <section className="split-heading">
            <div>
              <p className="split-kicker">
                Dividi PDF
              </p>

              <h1 className="split-title">
                Separa le pagine come preferisci.
              </h1>
            </div>

            <p className="split-description">
              Crea più PDF da intervalli personalizzati oppure genera
              un documento separato per ogni pagina. Tutto resta su
              questo dispositivo.
            </p>
          </section>

          {!pdf ? (
            <section
              className={[
                'split-empty-dropzone',
                externalDragging ? 'is-dragging' : '',
              ].filter(Boolean).join(' ')}
              aria-label="Apri un documento PDF da dividere"
            >
              <div
                className="split-empty-icon"
                aria-hidden="true"
              >
                <DocumentIcon />

                <span className="split-empty-badge">
                  <ToolIcon id="split" />
                </span>
              </div>

              <div className="split-empty-copy">
                <strong>
                  {loading
                    ? 'Apertura documento...'
                    : 'Trascina qui un PDF'}
                </strong>

                <span>
                  Scegli il documento da dividere. Il file viene
                  aperto ed elaborato solo sul dispositivo.
                </span>
              </div>

              <button
                className="primary-button"
                type="button"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                {loading ? 'Apertura...' : 'Scegli PDF'}
              </button>
            </section>
          ) : (
            <>
              <section
                className="split-summary"
                aria-label="Riepilogo documento"
              >
                <div className="split-summary-card">
                  <span>Pagine</span>
                  <strong>{pageCount}</strong>
                </div>

                <div className="split-summary-card">
                  <span>Dimensione</span>
                  <strong>{formatBytes(pdf.size)}</strong>
                </div>

                <div className="split-summary-card">
                  <span>Output previsti</span>
                  <strong>
                    {planError
                      ? '—'
                      : splitPlan.outputs.length}
                  </strong>
                </div>
              </section>

              <section className="split-document-bar">
                <div className="split-document-icon">
                  <DocumentIcon />
                </div>

                <div className="split-document-copy">
                  <strong title={pdf.name}>
                    {pdf.name}
                  </strong>

                  <span>
                    {pageCount}
                    {' '}
                    {pageCount === 1 ? 'pagina' : 'pagine'}
                    {' · '}
                    {formatBytes(pdf.size)}
                  </span>

                  <small>
                    Memorizzato ed elaborato localmente
                  </small>
                </div>

                <button
                  className="secondary-button compact-button"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ReplaceIcon />
                  <span>Sostituisci</span>
                </button>
              </section>

              <section className="split-config-grid">
                <div className="split-panel">
                  <div className="split-panel-heading">
                    <p className="split-panel-kicker">
                      Passo 1
                    </p>

                    <h2>
                      Cosa vuoi ottenere?
                    </h2>

                    <p className="ux-panel-intro">
                      Scegli l’opzione che descrive meglio
                      il risultato che ti serve.
                    </p>
                  </div>

                  <div
                    className="split-mode-grid"
                    role="group"
                    aria-label="Tipo di divisione"
                  >
                    <button
                      className={[
                        'split-mode-button',
                        mode === 'ranges'
                          ? 'is-active'
                          : '',
                      ].filter(Boolean).join(' ')}
                      type="button"
                      disabled={controlsDisabled}
                      aria-pressed={mode === 'ranges'}
                      onClick={() => {
                        setMode('ranges');
                        setError(null);
                        setStatusMessage(null);
                      }}
                    >
                      <span className="split-mode-icon">
                        <ToolIcon id="split" />
                      </span>

                      <span>
                        <span className="ux-title-row">
                          <strong>
                            Creare più PDF per gruppi di pagine
                          </strong>

                          <em className="ux-badge">
                            Consigliato
                          </em>
                        </span>

                        <small>
                          Decidi quali pagine devono restare
                          insieme in ciascun nuovo PDF.
                        </small>
                      </span>
                    </button>

                    <button
                      className={[
                        'split-mode-button',
                        mode === 'pages'
                          ? 'is-active'
                          : '',
                      ].filter(Boolean).join(' ')}
                      type="button"
                      disabled={controlsDisabled}
                      aria-pressed={mode === 'pages'}
                      onClick={() => {
                        setMode('pages');
                        setError(null);
                        setStatusMessage(null);
                      }}
                    >
                      <span className="split-mode-icon">
                        <DocumentIcon />
                      </span>

                      <span>
                        <strong>
                          Separare ogni pagina
                        </strong>

                        <small>
                          Ottieni un PDF distinto per
                          ciascuna pagina del documento.
                        </small>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="split-panel">
                  <div className="split-panel-heading">
                    <p className="split-panel-kicker">
                      {mode === 'ranges'
                        ? 'Passo 2'
                        : 'Risultato'}
                    </p>

                    <h2>
                      {mode === 'ranges'
                        ? 'Quali pagine vanno insieme?'
                        : 'Un file per ogni pagina'}
                    </h2>
                  </div>

                  {mode === 'ranges' ? (
                    <div className="split-range-field">
                      <label htmlFor="split-ranges">
                        Gruppi di pagine
                      </label>

                      <input
                        id="split-ranges"
                        className={[
                          'split-range-input',
                          planError ? 'has-error' : '',
                        ].filter(Boolean).join(' ')}
                        type="text"
                        value={rangeInput}
                        disabled={controlsDisabled}
                        placeholder="Es. 1-3, 5, 8-10"
                        spellCheck={false}
                        autoComplete="off"
                        aria-invalid={Boolean(planError)}
                        onChange={(event) => {
                          setRangeInput(event.currentTarget.value);
                          setError(null);
                          setStatusMessage(null);
                        }}
                      />

                      <div className="ux-field-explainer">
                        <strong>
                          Come funziona
                        </strong>

                        <span>
                          Ogni elemento separato da una
                          virgola diventa un PDF distinto.
                        </span>

                        <div className="ux-example-row">
                          <span>
                            1-3
                          </span>

                          <span>
                            5
                          </span>

                          <span>
                            8-10
                          </span>
                        </div>

                        <small>
                          Nell’esempio verranno creati
                          3 PDF: pagine 1-3, pagina 5
                          e pagine 8-10.
                        </small>
                      </div>

                      {planError && (
                        <span
                          className="split-inline-error"
                          role="alert"
                        >
                          {planError}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="split-pages-mode-note ux-simple-result">
                      <span className="ux-badge">
                        Nessuna configurazione
                      </span>

                      <strong>
                        Creeremo {pageCount}
                        {' '}
                        {pageCount === 1
                          ? 'PDF'
                          : 'PDF'}
                      </strong>

                      <span>
                        Ogni file conterrà una sola pagina.
                        Non devi scegliere altro.
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {!planError && splitPlan.outputs.length > 0 && (
                <section
                  className="split-output-section"
                  aria-labelledby="split-output-title"
                >
                  <div className="split-section-heading">
                    <div>
                      <p className="split-panel-kicker">
                        Output
                      </p>

                      <h2 id="split-output-title">
                        PDF che verranno creati
                      </h2>
                    </div>

                    <span>
                      {splitPlan.outputs.length}
                      {' '}
                      {splitPlan.outputs.length === 1
                        ? 'documento'
                        : 'documenti'}
                    </span>
                  </div>

                  <div className="split-output-list">
                    {splitPlan.outputs.map(
                      (output, index) => (
                        <article
                          key={output.id}
                          className="split-output-card"
                        >
                          <div className="split-output-index">
                            {index + 1}
                          </div>

                          <div className="split-output-copy">
                            <strong>
                              {output.label}
                            </strong>

                            <span title={output.fileName}>
                              {output.fileName}
                            </span>
                          </div>

                          <button
                            className="split-output-download"
                            type="button"
                            disabled={controlsDisabled}
                            onClick={() => void exportOutput(output)}
                            aria-label={`Scarica ${output.label}`}
                            title={`Scarica ${output.fileName}`}
                          >
                            <DownloadIcon />
                            <span>Scarica</span>
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              )}

              <section
                className="split-pages-section"
                aria-labelledby="split-pages-title"
              >
                <div className="split-section-heading">
                  <div>
                    <p className="split-panel-kicker">
                      Anteprima
                    </p>

                    <h2 id="split-pages-title">
                      Pagine del documento
                    </h2>
                  </div>

                  <span>
                    Rendering locale e progressivo
                  </span>
                </div>

                <div className="split-pages-grid">
                  {pageNumbers.map((pageNumber) => (
                    <SplitPdfPagePreview
                      key={pageNumber}
                      document={pdf.document}
                      pageNumber={pageNumber}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {error && (
            <div
              className="split-message split-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {statusMessage && (
            <div
              className="split-message split-success"
              role="status"
            >
              {statusMessage}
            </div>
          )}

          <div className="split-privacy-note">
            <ShieldIcon />

            <span>
              Nessun caricamento. Apertura, anteprima,
              divisione ed esportazione avvengono sul dispositivo.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}