import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  BrowserPdfEngine,
  PageCrop,
} from '@giumag/pdf-engine';
import type { LoadedPdf } from '../lib/pdf';
import {
  formatBytes,
  loadPdfFile,
} from '../lib/pdf';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
  UndoIcon,
} from './Icons';
import {
  CropPdfCanvas,
  type NormalizedCrop,
} from './CropPdfCanvas';
import { PdfThumbnail } from './PdfThumbnail';

interface CropPdfWorkspaceProps {
  onClose: () => void;
}

const DEFAULT_CROP: NormalizedCrop = {
  x: 0.05,
  y: 0.05,
  width: 0.9,
  height: 0.9,
};

let pdfEnginePromise: Promise<BrowserPdfEngine> | null = null;

function getPdfEngine(): Promise<BrowserPdfEngine> {
  if (!pdfEnginePromise) {
    pdfEnginePromise = import('@giumag/pdf-engine').then(
      ({ BrowserPdfEngine }) =>
        new BrowserPdfEngine(),
    );
  }

  return pdfEnginePromise;
}

function copyCrop(
  crop: NormalizedCrop,
): NormalizedCrop {
  return {
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
  };
}

function acceptsPdf(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

function dataTransferHasFiles(
  dataTransfer: DataTransfer,
) {
  return Array.from(
    dataTransfer.types,
  ).includes('Files');
}

function outputName(name: string) {
  const base =
    name.replace(/\.pdf$/i, '') ||
    'documento';

  return `${base}-ritagliato.pdf`;
}

function downloadPdf(
  bytes: Uint8Array,
  fileName: string,
) {
  const copy = new Uint8Array(
    bytes.byteLength,
  );

  copy.set(bytes);

  const blob = new Blob(
    [copy.buffer],
    {
      type: 'application/pdf',
    },
  );

  const url = URL.createObjectURL(
    blob,
  );

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
    1200,
  );
}

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function CropPdfWorkspace({
  onClose,
}: CropPdfWorkspaceProps) {
  const [pdf, setPdf] =
    useState<LoadedPdf | null>(null);

  const [activePageIndex, setActivePageIndex] =
    useState(0);

  const [crops, setCrops] = useState<
    Record<number, NormalizedCrop>
  >({});

  const [draftCrop, setDraftCrop] =
    useState<NormalizedCrop>(
      copyCrop(DEFAULT_CROP),
    );

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState<string | null>(null);

  const [
    externalDragging,
    setExternalDragging,
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const pdfRef =
    useRef<LoadedPdf | null>(null);

  const mountedRef =
    useRef(true);

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

  useEffect(() => {
    setDraftCrop(
      copyCrop(
        crops[activePageIndex] ??
          DEFAULT_CROP,
      ),
    );
  }, [
    activePageIndex,
    crops,
  ]);

  const pageCount =
    pdf?.document.numPages ?? 0;

  const modifiedIndexes = useMemo(
    () => (
      Object.keys(crops)
        .map((key) => Number(key))
        .filter(Number.isInteger)
        .sort((a, b) => a - b)
    ),
    [crops],
  );

  const modifiedCount =
    modifiedIndexes.length;

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
    setStatusMessage(null);

    try {
      const loaded =
        await loadPdfFile(file);

      if (!mountedRef.current) {
        await loaded.document.loadingTask.destroy();
        return;
      }

      const previous =
        pdfRef.current;

      pdfRef.current = loaded;

      setPdf(loaded);
      setActivePageIndex(0);
      setCrops({});
      setDraftCrop(
        copyCrop(DEFAULT_CROP),
      );

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

  function openDroppedFiles(
    files: File[],
  ) {
    const file =
      files.find(acceptsPdf);

    if (!file) {
      setError(
        'Trascina un documento PDF valido.',
      );

      return;
    }

    void openFile(file);
  }

  function setSafePage(
    index: number,
  ) {
    if (!pdf) {
      return;
    }

    setActivePageIndex(
      Math.max(
        0,
        Math.min(
          pdf.document.numPages - 1,
          index,
        ),
      ),
    );

    setError(null);
    setStatusMessage(null);
  }

  function applyToCurrentPage() {
    if (!pdf) {
      return;
    }

    setCrops((current) => ({
      ...current,
      [activePageIndex]:
        copyCrop(draftCrop),
    }));

    setError(null);

    setStatusMessage(
      `Ritaglio applicato alla pagina ${
        activePageIndex + 1
      }.`,
    );
  }

  function applyToAllPages() {
    if (!pdf) {
      return;
    }

    const next: Record<
      number,
      NormalizedCrop
    > = {};

    for (
      let index = 0;
      index < pdf.document.numPages;
      index += 1
    ) {
      next[index] =
        copyCrop(draftCrop);
    }

    setCrops(next);
    setError(null);

    setStatusMessage(
      `Ritaglio applicato a ${
        pdf.document.numPages
      } ${
        pdf.document.numPages === 1
          ? 'pagina'
          : 'pagine'
      }.`,
    );
  }

  function resetCurrentPage() {
    setCrops((current) => {
      const next = {
        ...current,
      };

      delete next[activePageIndex];

      return next;
    });

    setDraftCrop(
      copyCrop(DEFAULT_CROP),
    );

    setError(null);

    setStatusMessage(
      `Ritaglio rimosso dalla pagina ${
        activePageIndex + 1
      }.`,
    );
  }

  function resetAllPages() {
    setCrops({});
    setDraftCrop(
      copyCrop(DEFAULT_CROP),
    );

    setError(null);

    setStatusMessage(
      'Tutti i ritagli sono stati rimossi.',
    );
  }

  async function toPageCrop(
    pageIndex: number,
    crop: NormalizedCrop,
  ): Promise<PageCrop> {
    if (!pdf) {
      throw new Error(
        'Nessun documento PDF aperto.',
      );
    }

    const page =
      await pdf.document.getPage(
        pageIndex + 1,
      );

    const viewport =
      page.getViewport({
        scale: 1,
      });

    const left =
      crop.x * viewport.width;

    const top =
      crop.y * viewport.height;

    const right =
      (
        crop.x +
        crop.width
      ) * viewport.width;

    const bottom =
      (
        crop.y +
        crop.height
      ) * viewport.height;

    const firstPoint =
      viewport.convertToPdfPoint(
        left,
        top,
      );

    const secondPoint =
      viewport.convertToPdfPoint(
        right,
        bottom,
      );

    const x = Math.min(
      firstPoint[0],
      secondPoint[0],
    );

    const y = Math.min(
      firstPoint[1],
      secondPoint[1],
    );

    const width = Math.abs(
      secondPoint[0] -
        firstPoint[0],
    );

    const height = Math.abs(
      secondPoint[1] -
        firstPoint[1],
    );

    return {
      pageIndex,
      x,
      y,
      width,
      height,
    };
  }

  async function exportDocument() {
    const currentPdf =
      pdfRef.current;

    if (!currentPdf || !pdf) {
      setError(
        'Apri un documento PDF prima di esportare.',
      );

      return;
    }

    if (modifiedCount === 0) {
      setError(
        'Applica almeno un ritaglio prima di esportare.',
      );

      return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);

    try {
      const pageCrops: PageCrop[] =
        [];

      for (
        const pageIndex of modifiedIndexes
      ) {
        pageCrops.push(
          await toPageCrop(
            pageIndex,
            crops[pageIndex],
          ),
        );
      }

      const engine =
        await getPdfEngine();

      const bytes =
        await engine.crop(
          currentPdf.bytes,
          pageCrops,
        );

      downloadPdf(
        bytes,
        outputName(
          currentPdf.name,
        ),
      );

      if (mountedRef.current) {
        setStatusMessage(
          `${modifiedCount} ${
            modifiedCount === 1
              ? 'pagina ritagliata'
              : 'pagine ritagliate'
          } ed esportate localmente.`,
        );
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile ritagliare questo PDF.',
      );
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  const currentApplied =
    crops[activePageIndex];

  const controlsDisabled =
    loading || busy;

  const rightMargin =
    1 -
    draftCrop.x -
    draftCrop.width;

  const bottomMargin =
    1 -
    draftCrop.y -
    draftCrop.height;

  return (
    <main className="workspace-shell crop-shell">
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
            Ritaglia PDF
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
                event.currentTarget.files?.[0];

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
            disabled={
              controlsDisabled ||
              !pdf ||
              modifiedCount === 0
            }
            onClick={() =>
              void exportDocument()
            }
          >
            <DownloadIcon />

            <span>
              {busy
                ? 'Esportazione...'
                : 'Esporta PDF'}
            </span>
          </button>
        </div>
      </header>

      <div
        className={[
          'crop-workspace',
          externalDragging
            ? 'crop-workspace-dragging'
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

          event.dataTransfer.dropEffect =
            'copy';

          setExternalDragging(true);
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
        {!pdf ? (
          <div className="crop-empty-content">
            <section className="crop-heading">
              <div>
                <p className="crop-kicker">
                  Ritaglia PDF
                </p>

                <h1 className="crop-title">
                  Regola visivamente l’area delle pagine.
                </h1>
              </div>

              <p className="crop-description">
                Seleziona l’area da mantenere e applicala
                a una pagina oppure all’intero documento.
                Tutto avviene sul dispositivo.
              </p>
            </section>

            <section
              className={[
                'crop-empty-dropzone',
                externalDragging
                  ? 'is-dragging'
                  : '',
              ].filter(Boolean).join(' ')}
            >
              <div
                className="crop-empty-icon"
                aria-hidden="true"
              >
                <DocumentIcon />

                <span className="crop-empty-badge">
                  <ToolIcon id="crop" />
                </span>
              </div>

              <div className="crop-empty-copy">
                <strong>
                  {loading
                    ? 'Apertura documento...'
                    : 'Trascina qui un PDF'}
                </strong>

                <span>
                  Scegli un documento e modifica
                  graficamente l’area visibile delle
                  sue pagine.
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
          </div>
        ) : (
          <div className="crop-layout">
            <aside
              className="crop-thumbnail-sidebar"
              aria-label="Pagine del documento"
            >
              <div className="crop-sidebar-heading">
                <span>
                  Pagine
                </span>

                <span className="count-badge">
                  {pageCount}
                </span>
              </div>

              <div className="crop-thumbnail-list">
                {Array.from(
                  {
                    length: pageCount,
                  },
                  (_, pageIndex) => (
                    <div
                      key={pageIndex}
                      className="crop-thumbnail-item"
                    >
                      <PdfThumbnail
                        document={pdf.document}
                        sourcePageNumber={
                          pageIndex + 1
                        }
                        displayNumber={
                          pageIndex + 1
                        }
                        active={
                          pageIndex ===
                          activePageIndex
                        }
                        selected={
                          Boolean(
                            crops[pageIndex],
                          )
                        }
                        rotation={0}
                        draggable={false}
                        onSelect={() =>
                          setSafePage(pageIndex)
                        }
                        onDragStart={(event) =>
                          event.preventDefault()
                        }
                        onDragOver={(event) =>
                          event.preventDefault()
                        }
                        onDrop={(event) =>
                          event.preventDefault()
                        }
                        onDragEnd={() => {}}
                      />

                      {crops[pageIndex] && (
                        <span className="crop-thumbnail-badge">
                          Ritagliata
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
            </aside>

            <section
              className="crop-editor"
              aria-label={`Editor ritaglio pagina ${
                activePageIndex + 1
              }`}
            >
              <div className="crop-editor-toolbar glass-surface">
                <button
                  type="button"
                  className="toolbar-button"
                  disabled={
                    activePageIndex === 0 ||
                    controlsDisabled
                  }
                  onClick={() =>
                    setSafePage(
                      activePageIndex - 1,
                    )
                  }
                  aria-label="Pagina precedente"
                >
                  <ChevronLeftIcon />
                </button>

                <div className="crop-page-counter">
                  <strong>
                    {activePageIndex + 1}
                  </strong>

                  <span>
                    di {pageCount}
                  </span>
                </div>

                <button
                  type="button"
                  className="toolbar-button"
                  disabled={
                    activePageIndex ===
                      pageCount - 1 ||
                    controlsDisabled
                  }
                  onClick={() =>
                    setSafePage(
                      activePageIndex + 1,
                    )
                  }
                  aria-label="Pagina successiva"
                >
                  <ChevronRightIcon />
                </button>
              </div>

              <div className="crop-editor-scroll">
                <CropPdfCanvas
                  document={pdf.document}
                  pageNumber={
                    activePageIndex + 1
                  }
                  crop={draftCrop}
                  disabled={
                    controlsDisabled
                  }
                  onChange={(nextCrop) => {
                    setDraftCrop(
                      nextCrop,
                    );

                    setError(null);
                    setStatusMessage(null);
                  }}
                />
              </div>

              <div className="crop-editor-hint">
                Sposta il rettangolo e trascina le maniglie:
                tutto ciò che rimane dentro sarà visibile.
              </div>
            </section>

            <aside className="crop-controls-panel">
              <div className="crop-controls-scroll">
                <section className="crop-control-section">
                  <p className="crop-panel-kicker">
                    Passo 1 · Pagina {activePageIndex + 1}
                  </p>

                  <h2>
                    Scegli cosa mantenere
                  </h2>

                  <p className="crop-panel-description">
                    Regola il rettangolo direttamente
                    sulla pagina. Tutto ciò che resta
                    all’interno sarà visibile nel PDF.
                  </p>

                  <details className="ux-advanced crop-measure-details">
                    <summary>
                      <span>
                        <strong>
                          Misure dell’area
                        </strong>

                        <small>
                          Mostra i margini esatti
                        </small>
                      </span>

                      <span
                        className="ux-advanced-chevron"
                        aria-hidden="true"
                      />
                    </summary>

                    <div className="ux-advanced-body">
                      <div className="crop-measure-grid">
                        <div>
                          <span>
                            Sinistra
                          </span>

                          <strong>
                            {percentage(
                              draftCrop.x,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Alto
                          </span>

                          <strong>
                            {percentage(
                              draftCrop.y,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Destra
                          </span>

                          <strong>
                            {percentage(
                              rightMargin,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Basso
                          </span>

                          <strong>
                            {percentage(
                              bottomMargin,
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </details>
                </section>

                <section className="crop-control-section crop-apply-choice">
                  <p className="crop-panel-kicker">
                    Passo 2
                  </p>

                  <h2>
                    Dove vuoi applicarlo?
                  </h2>

                  <p className="crop-panel-description">
                    Usa “Solo questa pagina” se le pagine
                    hanno layout diversi.
                  </p>

                  <div className="crop-action-stack">
                    <button
                      className="primary-button crop-panel-button"
                      type="button"
                      disabled={
                        controlsDisabled
                      }
                      onClick={
                        applyToCurrentPage
                      }
                    >
                      <ToolIcon id="crop" />

                      <span>
                        Solo questa pagina
                      </span>
                    </button>

                    <button
                      className="secondary-button crop-panel-button"
                      type="button"
                      disabled={
                        controlsDisabled
                      }
                      onClick={
                        applyToAllPages
                      }
                    >
                      <ToolIcon id="crop" />

                      <span>
                        Tutte le {pageCount} pagine
                      </span>
                    </button>
                  </div>
                </section>

                <section className="crop-control-section">
                  <p className="crop-panel-kicker">
                    Annulla modifiche
                  </p>

                  <div className="crop-action-stack">
                    <button
                      className="crop-text-button"
                      type="button"
                      disabled={
                        controlsDisabled ||
                        !currentApplied
                      }
                      onClick={
                        resetCurrentPage
                      }
                    >
                      <UndoIcon />

                      <span>
                        Ripristina questa pagina
                      </span>
                    </button>

                    <button
                      className="crop-text-button"
                      type="button"
                      disabled={
                        controlsDisabled ||
                        modifiedCount === 0
                      }
                      onClick={resetAllPages}
                    >
                      <UndoIcon />

                      <span>
                        Ripristina tutto il documento
                      </span>
                    </button>
                  </div>
                </section>

                <section className="crop-control-section crop-summary-section">
                  <span>
                    Pagine con ritaglio
                  </span>

                  <strong>
                    {modifiedCount}
                  </strong>

                  <small>
                    di {pageCount}
                  </small>
                </section>

                <section className="crop-security-note">
                  <ShieldIcon />

                  <div>
                    <strong>
                      Il ritaglio non oscura dati sensibili.
                    </strong>

                    <span>
                      Modifica l’area visibile della
                      pagina, ma il contenuto esterno
                      può restare nel file. Per
                      eliminarlo definitivamente servirà
                      lo strumento Oscura PDF.
                    </span>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        )}

        {error && (
          <div
            className="crop-message crop-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {statusMessage && (
          <div
            className="crop-message crop-success"
            role="status"
          >
            {statusMessage}
          </div>
        )}
      </div>
    </main>
  );
}