import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  LoadedPdf,
} from '../lib/pdf';

import {
  formatBytes,
  loadPdfFile,
} from '../lib/pdf';

import {
  redactPdf,
  type RedactionArea,
  type RedactPdfPageSpec,
  type RedactPdfProgress,
} from '../lib/redact-pdf';

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
  PdfThumbnail,
} from './PdfThumbnail';

import {
  RedactPdfCanvas,
} from './RedactPdfCanvas';

import {
  WorkspaceHeader,
  WorkspaceIntro,
} from './ui/WorkspaceChrome';

interface RedactPdfWorkspaceProps {
  onClose: () => void;
}

interface RedactResult {
  bytes: Uint8Array;
  name: string;
}

let redactionSerial = 0;

function nextRedactionId() {
  redactionSerial += 1;

  return `redact-${Date.now()}-${redactionSerial}`;
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

function dataTransferHasFiles(
  dataTransfer:
    DataTransfer,
) {
  return Array.from(
    dataTransfer.types,
  ).includes(
    'Files',
  );
}

function outputName(
  name: string,
) {
  const base =
    name.replace(
      /\.pdf$/i,
      '',
    ) ||
    'documento';

  return `${base}-oscurato.pdf`;
}

function downloadPdf(
  bytes: Uint8Array,
  fileName: string,
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

  anchor.href =
    url;

  anchor.download =
    fileName;

  anchor.style.display =
    'none';

  document.body
    .appendChild(
      anchor,
    );

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        url,
      ),
    1200,
  );
}

function progressText(
  progress:
    RedactPdfProgress,
) {
  if (
    progress.phase ===
    'rendering'
  ) {
    if (
      progress.completed ===
      0
    ) {
      return 'Preparo le pagine in locale…';
    }

    return `Preparo pagina ${Math.min(
      progress.completed,
      progress.total,
    )} di ${progress.total}`;
  }

  return 'Applico gli oscuramenti e ricostruisco il PDF…';
}

export function RedactPdfWorkspace({
  onClose,
}: RedactPdfWorkspaceProps) {
  const [
    pdf,
    setPdf,
  ] =
    useState<LoadedPdf | null>(
      null,
    );

  const [
    activePageIndex,
    setActivePageIndex,
  ] =
    useState(0);

  const [
    redactions,
    setRedactions,
  ] =
    useState<
      Record<
        number,
        RedactionArea[]
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    externalDragging,
    setExternalDragging,
  ] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState<
      RedactPdfProgress | null
    >(null);

  const [
    result,
    setResult,
  ] =
    useState<
      RedactResult | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    statusMessage,
    setStatusMessage,
  ] =
    useState<
      string | null
    >(null);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const pdfRef =
    useRef<
      LoadedPdf | null
    >(null);

  const mountedRef =
    useRef(true);

  useEffect(() => {
    /*
     * Necessario anche qui per React Strict Mode:
     * setup -> cleanup -> setup.
     */
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      const current =
        pdfRef.current;

      pdfRef.current =
        null;

      if (current) {
        void current.document
          .loadingTask
          .destroy();
      }
    };
  }, []);

  const pageCount =
    pdf?.document
      .numPages ?? 0;

  const activeAreas =
    redactions[
      activePageIndex
    ] ?? [];

  const totalAreas =
    Object.values(
      redactions,
    ).reduce(
      (
        total,
        areas,
      ) =>
        total +
        areas.length,
      0,
    );

  const controlsDisabled =
    loading ||
    busy;

  function invalidateResult() {
    setResult(null);
    setStatusMessage(null);
    setError(null);
  }

  function setSafePage(
    pageIndex: number,
  ) {
    if (
      pageCount <= 0
    ) {
      return;
    }

    setActivePageIndex(
      Math.min(
        pageCount - 1,
        Math.max(
          0,
          pageIndex,
        ),
      ),
    );
  }

  async function openFile(
    file: File,
  ) {
    if (
      controlsDisabled
    ) {
      return;
    }

    if (
      !acceptsPdf(
        file,
      )
    ) {
      setError(
        'Seleziona un documento PDF.',
      );

      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);
    setResult(null);
    setProgress(null);

    try {
      const loaded =
        await loadPdfFile(
          file,
        );

      if (
        !mountedRef.current
      ) {
        await loaded.document
          .loadingTask
          .destroy();

        return;
      }

      const previous =
        pdfRef.current;

      pdfRef.current =
        loaded;

      setPdf(
        loaded,
      );

      setActivePageIndex(
        0,
      );

      setRedactions(
        {},
      );

      if (previous) {
        await previous.document
          .loadingTask
          .destroy();
      }
    } catch (caught) {
      if (
        mountedRef.current
      ) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Impossibile aprire questo PDF.',
        );
      }
    } finally {
      if (
        mountedRef.current
      ) {
        setLoading(
          false,
        );
      }
    }
  }

  function addArea(
    area:
      Omit<
        RedactionArea,
        'id'
      >,
  ) {
    if (
      controlsDisabled
    ) {
      return;
    }

    invalidateResult();

    setRedactions(
      (current) => {
        const existing =
          current[
            activePageIndex
          ] ?? [];

        return {
          ...current,
          [activePageIndex]:
            [
              ...existing,
              {
                ...area,
                id:
                  nextRedactionId(),
              },
            ],
        };
      },
    );
  }

  function removeArea(
    id: string,
  ) {
    if (
      controlsDisabled
    ) {
      return;
    }

    invalidateResult();

    setRedactions(
      (current) => ({
        ...current,
        [activePageIndex]:
          (
            current[
              activePageIndex
            ] ?? []
          ).filter(
            (area) =>
              area.id !==
              id,
          ),
      }),
    );
  }

  function undoLast() {
    if (
      controlsDisabled ||
      activeAreas.length ===
        0
    ) {
      return;
    }

    invalidateResult();

    setRedactions(
      (current) => ({
        ...current,
        [activePageIndex]:
          (
            current[
              activePageIndex
            ] ?? []
          ).slice(
            0,
            -1,
          ),
      }),
    );
  }

  function clearPage() {
    if (
      controlsDisabled ||
      activeAreas.length ===
        0
    ) {
      return;
    }

    invalidateResult();

    setRedactions(
      (current) => ({
        ...current,
        [activePageIndex]:
          [],
      }),
    );
  }

  function clearAll() {
    if (
      controlsDisabled ||
      totalAreas === 0
    ) {
      return;
    }

    invalidateResult();

    setRedactions(
      {},
    );
  }

  async function createPageSpecs(
    currentPdf:
      LoadedPdf,
  ): Promise<
    RedactPdfPageSpec[]
  > {
    const specs:
      RedactPdfPageSpec[] =
      [];

    for (
      let pageIndex = 0;
      pageIndex <
        currentPdf
          .document
          .numPages;
      pageIndex += 1
    ) {
      const page =
        await currentPdf
          .document
          .getPage(
            pageIndex + 1,
          );

      const viewport =
        page.getViewport({
          scale: 1,
        });

      specs.push({
        pageIndex,
        pageWidth:
          viewport.width,
        pageHeight:
          viewport.height,
        redactions:
          (
            redactions[
              pageIndex
            ] ?? []
          ).map(
            (area) => ({
              ...area,
            }),
          ),
      });
    }

    return specs;
  }

  async function exportDocument() {
    const currentPdf =
      pdfRef.current;

    if (
      !currentPdf ||
      busy ||
      totalAreas === 0
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);
    setResult(null);

    setProgress({
      phase:
        'rendering',
      completed: 0,
      total:
        currentPdf.document
          .numPages,
      percent: 0,
    });

    try {
      const pageSpecs =
        await createPageSpecs(
          currentPdf,
        );

      const bytes =
        await redactPdf(
          currentPdf.bytes,
          pageSpecs,
          {
            onProgress:
              (value) => {
                if (
                  mountedRef.current
                ) {
                  setProgress(
                    value,
                  );
                }
              },
          },
        );

      if (
        !mountedRef.current
      ) {
        return;
      }

      const name =
        outputName(
          currentPdf.name,
        );

      setResult({
        bytes,
        name,
      });

      setProgress(null);

      downloadPdf(
        bytes,
        name,
      );

      setStatusMessage(
        `${totalAreas} ${
          totalAreas === 1
            ? 'area oscurata'
            : 'aree oscurate'
        }. PDF sicuro creato e scaricato.`,
      );
    } catch (caught) {
      if (
        mountedRef.current
      ) {
        setProgress(null);

        setError(
          caught instanceof Error
            ? caught.message
            : 'Impossibile oscurare questo PDF.',
        );
      }
    } finally {
      if (
        mountedRef.current
      ) {
        setBusy(
          false,
        );
      }
    }
  }

  function closeWorkspace() {
    onClose();
  }

  return (
    <main
      className="workspace-shell crop-shell redact-shell"
      aria-busy={
        loading ||
        busy
      }
    >
      <WorkspaceHeader empty={!pdf}>
        <button
          className="brand-button"
          type="button"
          onClick={
            closeWorkspace
          }
          aria-label="Torna alla home di Giumag PDF"
        >
          <span className="brand-mark">
            G
          </span>

          <span>
            Giumag PDF
          </span>
        </button>

        {pdf && (
          <div className="document-title redact-document-title">
            <strong>
              Oscura PDF
            </strong>

            <span>
              <ShieldIcon />

              {`Rimozione sicura · ${pageCount} ${
                pageCount === 1
                  ? 'pagina'
                  : 'pagine'
              }`}
            </span>
          </div>
        )}

        <div className="topbar-actions">
          <input
            ref={
              fileInputRef
            }
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(
              event,
            ) => {
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

          <button
            className="secondary-button compact-button"
            type="button"
            hidden={!pdf}
            disabled={
              controlsDisabled
            }
            onClick={() =>
              fileInputRef
                .current
                ?.click()
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
            className="primary-button compact-button redact-export-topbar"
            type="button"
            hidden={!pdf}
            disabled={
              controlsDisabled ||
              !pdf ||
              totalAreas === 0
            }
            data-auto-advance-action="true"
            onClick={() =>
              void exportDocument()
            }
          >
            <DownloadIcon />

            <span>
              {busy
                ? 'Creo…'
                : 'Crea PDF sicuro'}
            </span>
          </button>

          <button
            className="secondary-button coherence-close-button"
            type="button"
            hidden={Boolean(pdf)}
            onClick={closeWorkspace}
          >
            Chiudi
          </button>
        </div>
      </WorkspaceHeader>

      <div
        className={[
          'crop-workspace',
          externalDragging
            ? 'crop-workspace-dragging'
            : '',
        ].filter(Boolean).join(' ')}
        onDragEnter={(
          event,
        ) => {
          event.preventDefault();

          if (
            !controlsDisabled &&
            dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            setExternalDragging(
              true,
            );
          }
        }}
        onDragOver={(
          event,
        ) => {
          event.preventDefault();

          if (
            !controlsDisabled &&
            dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            setExternalDragging(
              true,
            );
          }
        }}
        onDragLeave={(
          event,
        ) => {
          event.preventDefault();

          if (
            event.currentTarget ===
            event.target
          ) {
            setExternalDragging(
              false,
            );
          }
        }}
        onDrop={(
          event,
        ) => {
          event.preventDefault();

          setExternalDragging(
            false,
          );

          if (
            controlsDisabled
          ) {
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
        {!pdf ? (
          <div className="crop-empty-content">
            <WorkspaceIntro
              eyebrow="Oscura PDF"
              title="Elimina davvero le informazioni sensibili"
              description="Disegna le aree da nascondere direttamente sulle pagine. La copia finale viene ricostruita senza conservare il contenuto originale sottostante."
            />

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
                  <ToolIcon id="redact" />
                </span>
              </div>

              <div className="crop-empty-copy">
                <strong>
                  {loading
                    ? 'Apertura documento...'
                    : 'Trascina qui un PDF'}
                </strong>

                <span>
                  Oppure scegli il documento dal dispositivo.
                  Nessun file viene caricato online.
                </span>
              </div>

              <button
                type="button"
                className="primary-button redact-empty-choose-button"
                disabled={
                  loading
                }
                onClick={() =>
                  fileInputRef
                    .current
                    ?.click()
                }
              >
                <DocumentIcon />

                <span>
                  {loading
                    ? 'Apertura...'
                    : 'Scegli PDF'}
                </span>
              </button>
            </section>
          </div>
        ) : (
          <div className="crop-layout">
            <aside className="crop-thumbnail-sidebar">
              <div className="crop-thumbnail-list">
                {Array.from(
                  {
                    length:
                      pageCount,
                  },
                  (
                    _,
                    pageIndex,
                  ) => {
                    const count =
                      redactions[
                        pageIndex
                      ]?.length ??
                      0;

                    return (
                      <div
                        key={
                          pageIndex
                        }
                        className="crop-thumbnail-item"
                      >
                        <PdfThumbnail
                          document={
                            pdf.document
                          }
                          sourcePageNumber={
                            pageIndex +
                            1
                          }
                          displayNumber={
                            pageIndex +
                            1
                          }
                          active={
                            pageIndex ===
                            activePageIndex
                          }
                          selected={
                            count >
                            0
                          }
                          rotation={
                            0
                          }
                          draggable={
                            false
                          }
                          onSelect={() =>
                            setSafePage(
                              pageIndex,
                            )
                          }
                          onDragStart={(
                            event,
                          ) =>
                            event.preventDefault()
                          }
                          onDragOver={(
                            event,
                          ) =>
                            event.preventDefault()
                          }
                          onDrop={(
                            event,
                          ) =>
                            event.preventDefault()
                          }
                          onDragEnd={() => {
                            // Nessun riordino.
                          }}
                        />

                        {count >
                          0 && (
                          <span className="crop-thumbnail-badge">
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </aside>

            <section className="crop-editor">
              <div className="crop-editor-toolbar glass-surface">
                <button
                  type="button"
                  className="toolbar-button"
                  aria-label="Pagina precedente"
                  disabled={
                    controlsDisabled ||
                    activePageIndex <=
                      0
                  }
                  onClick={() =>
                    setSafePage(
                      activePageIndex -
                        1,
                    )
                  }
                >
                  <ChevronLeftIcon />
                </button>

                <span>
                  Pagina{' '}
                  <strong>
                    {activePageIndex +
                      1}
                  </strong>
                  {' / '}
                  {pageCount}
                </span>

                <button
                  type="button"
                  className="toolbar-button"
                  aria-label="Pagina successiva"
                  disabled={
                    controlsDisabled ||
                    activePageIndex >=
                      pageCount -
                        1
                  }
                  onClick={() =>
                    setSafePage(
                      activePageIndex +
                        1,
                    )
                  }
                >
                  <ChevronRightIcon />
                </button>
              </div>

              <div className="crop-editor-scroll">
                <RedactPdfCanvas
                  document={
                    pdf.document
                  }
                  pageNumber={
                    activePageIndex +
                    1
                  }
                  redactions={
                    activeAreas
                  }
                  disabled={
                    controlsDisabled
                  }
                  onAdd={
                    addArea
                  }
                  onRemove={
                    removeArea
                  }
                />
              </div>

              <div className="crop-editor-hint redact-editor-hint">
                Trascina sul contenuto da eliminare.
                Tocca un’area nera per rimuoverla.
              </div>
            </section>

            <aside className="crop-controls-panel">
              <div className="crop-controls-scroll">
                <section className="crop-control-section">
                  <p className="crop-panel-kicker">
                    Pagina attuale
                  </p>

                  <h2>
                    {activeAreas.length}{' '}
                    {activeAreas.length ===
                    1
                      ? 'area'
                      : 'aree'}
                  </h2>

                  <span className="redact-panel-copy">
                    Disegna più rettangoli se devi rimuovere
                    informazioni in punti diversi.
                  </span>
                </section>

                <section className="crop-control-section">
                  <p className="crop-panel-kicker">
                    Correzioni
                  </p>

                  <div className="redact-action-stack">
                    <button
                      type="button"
                      className="crop-panel-button"
                      disabled={
                        controlsDisabled ||
                        activeAreas.length ===
                          0
                      }
                      onClick={
                        undoLast
                      }
                    >
                      <UndoIcon />
                      <span>
                        Annulla ultima
                      </span>
                    </button>

                    <button
                      type="button"
                      className="crop-panel-button"
                      disabled={
                        controlsDisabled ||
                        activeAreas.length ===
                          0
                      }
                      onClick={
                        clearPage
                      }
                    >
                      Pulisci pagina
                    </button>

                    <button
                      type="button"
                      className="crop-panel-button redact-clear-all"
                      disabled={
                        controlsDisabled ||
                        totalAreas ===
                          0
                      }
                      onClick={
                        clearAll
                      }
                    >
                      Pulisci tutto
                    </button>
                  </div>
                </section>

                <section className="crop-control-section">
                  <p className="crop-panel-kicker">
                    Documento
                  </p>

                  <h2>
                    {totalAreas}{' '}
                    {totalAreas === 1
                      ? 'oscuramento'
                      : 'oscuramenti'}
                  </h2>

                  <span className="redact-panel-copy">
                    {pdf.name}
                    {' · '}
                    {formatBytes(
                      pdf.bytes
                        .byteLength,
                    )}
                  </span>
                </section>

                {progress && (
                  <section
                    className="crop-control-section redact-progress-section"
                    aria-live="polite"
                  >
                    <p className="crop-panel-kicker">
                      Elaborazione
                    </p>

                    <h2>
                      {progress.percent}%
                    </h2>

                    <span className="redact-panel-copy">
                      {progressText(
                        progress,
                      )}
                    </span>

                    <div
                      className="redact-progress-track"
                      role="progressbar"
                      aria-label="Avanzamento oscuramento PDF"
                      aria-valuemin={
                        0
                      }
                      aria-valuemax={
                        100
                      }
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

                {result && (
                  <section
                    className="crop-control-section redact-result-section"
                    data-auto-advance-target="true"
                    aria-live="polite"
                  >
                    <p className="crop-panel-kicker">
                      Pronto
                    </p>

                    <h2>
                      PDF sicuro creato
                    </h2>

                    <button
                      type="button"
                      className="primary-button redact-download-again"
                      onClick={() =>
                        downloadPdf(
                          result.bytes,
                          result.name,
                        )
                      }
                    >
                      <DownloadIcon />
                      <span>
                        Scarica di nuovo
                      </span>
                    </button>
                  </section>
                )}

                <section className="crop-security-note redact-security-note">
                  <ShieldIcon />

                  <div>
                    <strong>
                      Oscuramento irreversibile
                    </strong>

                    <span>
                      La copia finale viene ricostruita dalle pagine
                      già oscurate. Il testo, le immagini e gli
                      oggetti originali sotto le aree nere non
                      vengono copiati nel nuovo PDF.
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