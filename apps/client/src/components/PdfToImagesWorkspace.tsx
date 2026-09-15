import {
  useEffect,
  useMemo,
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
  pdfToImagesDpi,
  pdfToImagesExtension,
  type PdfToImagesFormat,
} from '../lib/pdf-to-images';

import {
  PdfToImagesWorkerClient,
  type PdfToImagesProgress,
  type PdfToImagesRenderedImage,
} from '../lib/pdf-to-images-worker';

import {
  createStoreZip,
} from '../lib/zip-store';

import {
  DocumentIcon,
  DownloadIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';

import {
  SplitPdfPagePreview,
} from './SplitPdfPagePreview';

import {
  WorkspaceHeader,
  WorkspaceIntro,
} from './ui/WorkspaceChrome';

interface PdfToImagesWorkspaceProps {
  onClose: () => void;
}

interface OutputEstimate {
  width: number;
  height: number;
}

const RESOLUTION_SCALES =
  [
    1,
    2,
    3,
    4,
  ] as const;

function dataTransferHasFiles(
  dataTransfer: DataTransfer,
) {
  return Array.from(
    dataTransfer.types,
  ).includes('Files');
}

function safeBaseFileName(
  name: string,
): string {
  const withoutExtension =
    name.replace(
      /\.pdf$/i,
      '',
    );

  const sanitized =
    withoutExtension
      .replace(
        /[<>:"/\\|?*\u0000-\u001f]/g,
        '-',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();

  return sanitized || 'documento';
}

function imageFileName(
  pdfName: string,
  pageIndex: number,
  pageCount: number,
  format: PdfToImagesFormat,
) {
  const digits =
    Math.max(
      2,
      String(
        pageCount,
      ).length,
    );

  const page =
    String(
      pageIndex + 1,
    ).padStart(
      digits,
      '0',
    );

  return (
    `${safeBaseFileName(pdfName)}` +
    `-pagina-${page}.` +
    pdfToImagesExtension(
      format,
    )
  );
}

function downloadBytes(
  bytes: Uint8Array,
  mimeType: string,
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
        type: mimeType,
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
  anchor.download =
    fileName;

  anchor.style.display =
    'none';

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

function sortedSelectedIndexes(
  selected: ReadonlySet<number>,
): number[] {
  return [
    ...selected,
  ].sort(
    (a, b) =>
      a - b,
  );
}

export function PdfToImagesWorkspace({
  onClose,
}: PdfToImagesWorkspaceProps) {
  const [
    pdf,
    setPdf,
  ] = useState<
    LoadedPdf | null
  >(null);

  const [
    selected,
    setSelected,
  ] = useState<
    Set<number>
  >(
    () =>
      new Set<number>(),
  );

  const [
    format,
    setFormat,
  ] = useState<
    PdfToImagesFormat
  >('png');

  const [
    scale,
    setScale,
  ] = useState(2);

  const [
    jpegQuality,
    setJpegQuality,
  ] = useState(0.9);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    exporting,
    setExporting,
  ] = useState(false);

  const [
    zipping,
    setZipping,
  ] = useState(false);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    progress,
    setProgress,
  ] = useState<
    PdfToImagesProgress | null
  >(null);

  const [
    results,
    setResults,
  ] = useState<
    PdfToImagesRenderedImage[] | null
  >(null);

  const [
    estimate,
    setEstimate,
  ] = useState<
    OutputEstimate | null
  >(null);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const workerRef =
    useRef<
      PdfToImagesWorkerClient | null
    >(null);

  const pdfRef =
    useRef<
      LoadedPdf | null
    >(null);

  useEffect(() => {
    pdfRef.current =
      pdf;
  }, [pdf]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();

      const current =
        pdfRef.current;

      if (current) {
        void current.document
          .loadingTask
          .destroy();
      }
    };
  }, []);

  const selectedCount =
    selected.size;

  const busy =
    loading ||
    exporting ||
    zipping;

  const dpi =
    pdfToImagesDpi(
      scale,
    );

  const totalResultSize =
    useMemo(
      () =>
        results?.reduce(
          (
            total,
            image,
          ) =>
            total +
            image.bytes.byteLength,
          0,
        ) ?? 0,
      [results],
    );

  function getWorker() {
    if (!workerRef.current) {
      workerRef.current =
        new PdfToImagesWorkerClient();
    }

    return workerRef.current;
  }

  function invalidateResults() {
    setResults(null);
    setProgress(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    const first =
      sortedSelectedIndexes(
        selected,
      )[0];

    if (
      !pdf ||
      first === undefined
    ) {
      setEstimate(null);
      return;
    }

    void pdf.document
      .getPage(
        first + 1,
      )
      .then(
        (page) => {
          if (cancelled) {
            return;
          }

          const viewport =
            page.getViewport({
              scale,
            });

          setEstimate({
            width:
              Math.max(
                1,
                Math.ceil(
                  viewport.width,
                ),
              ),

            height:
              Math.max(
                1,
                Math.ceil(
                  viewport.height,
                ),
              ),
          });
        },
      )
      .catch(
        () => {
          if (!cancelled) {
            setEstimate(null);
          }
        },
      );

    return () => {
      cancelled = true;
    };
  }, [
    pdf,
    scale,
    selected,
  ]);

  async function openFile(
    file: File,
  ) {
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(null);

    try {
      const loaded =
        await loadPdfFile(
          file,
        );

      const previous =
        pdfRef.current;

      if (previous) {
        await previous.document
          .loadingTask
          .destroy();
      }

      setPdf(loaded);

      setSelected(
        new Set(
          Array.from(
            {
              length:
                loaded.document
                  .numPages,
            },
            (
              _,
              index,
            ) => index,
          ),
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile aprire questo PDF.',
      );
    } finally {
      setLoading(false);
    }
  }

  function togglePage(
    pageIndex: number,
  ) {
    setSelected(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            pageIndex,
          )
        ) {
          next.delete(
            pageIndex,
          );
        } else {
          next.add(
            pageIndex,
          );
        }

        return next;
      },
    );

    invalidateResults();
  }

  function selectAll() {
    if (!pdf) {
      return;
    }

    setSelected(
      new Set(
        Array.from(
          {
            length:
              pdf.document
                .numPages,
          },
          (
            _,
            index,
          ) => index,
        ),
      ),
    );

    invalidateResults();
  }

  function selectNone() {
    setSelected(
      new Set(),
    );

    invalidateResults();
  }

  async function exportImages() {
    if (!pdf) {
      setError(
        'Apri prima un documento PDF.',
      );

      return;
    }

    const pages =
      sortedSelectedIndexes(
        selected,
      );

    if (
      pages.length === 0
    ) {
      setError(
        'Seleziona almeno una pagina.',
      );

      return;
    }

    setExporting(true);
    setResults(null);
    setError(null);

    setProgress({
      completed: 0,
      total:
        pages.length,
      pageIndex:
        pages[0],
    });

    try {
      const output =
        await getWorker().render(
          pdf.bytes,
          {
            pageIndexes:
              pages,
            format,
            scale,
            jpegQuality,
          },
          {
            onProgress:
              (next) => {
                setProgress(
                  next,
                );
              },
          },
        );

      setResults(
        output,
      );

      setProgress({
        completed:
          output.length,

        total:
          output.length,

        pageIndex:
          output[
            output.length - 1
          ]?.pageIndex ?? 0,
      });
    } catch (caught) {
      setProgress(null);

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile esportare le immagini.',
      );
    } finally {
      setExporting(false);
    }
  }

  function downloadImage(
    image:
      PdfToImagesRenderedImage,
  ) {
    if (!pdf) {
      return;
    }

    downloadBytes(
      image.bytes,
      image.mimeType,
      imageFileName(
        pdf.name,
        image.pageIndex,
        pdf.document
          .numPages,
        image.format,
      ),
    );
  }

  async function downloadZip() {
    if (
      !pdf ||
      !results ||
      results.length === 0
    ) {
      return;
    }

    setZipping(true);
    setError(null);

    try {
      await new Promise<void>(
        (resolve) => {
          window.requestAnimationFrame(
            () => {
              resolve();
            },
          );
        },
      );

      const zip =
        createStoreZip(
          results.map(
            (image) => ({
              name:
                imageFileName(
                  pdf.name,
                  image.pageIndex,
                  pdf.document
                    .numPages,
                  image.format,
                ),

              data:
                image.bytes,
            }),
          ),
        );

      downloadBytes(
        zip,
        'application/zip',
        `${
          safeBaseFileName(
            pdf.name,
          )
        }-immagini.zip`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile creare lo ZIP.',
      );
    } finally {
      setZipping(false);
    }
  }

  const progressPercent =
    progress &&
    progress.total > 0
      ? Math.round(
          (
            progress.completed /
            progress.total
          ) *
            100,
        )
      : 0;

  return (
    <main className="workspace-shell pdf-images-shell">
      <WorkspaceHeader empty={!pdf}>
        <button
          className="brand-button"
          type="button"
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

        {pdf && (
<div className="document-title">
          <strong>
            PDF in immagini
          </strong>

          <span>
            <ShieldIcon />

            {pdf
              ? `${pdf.document.numPages} ${
                  pdf.document.numPages === 1
                    ? 'pagina'
                    : 'pagine'
                } · locale`
              : 'Area di lavoro locale'}
          </span>
        </div>
        )}

        <div className="topbar-actions">
<input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file =
                event.currentTarget
                  .files?.[0];

              if (file) {
                void openFile(
                  file,
                );
              }

              event.currentTarget.value =
                '';
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
            disabled={busy}
            aria-label={
              pdf
                ? 'Sostituisci PDF'
                : 'Apri PDF'
            }
            onClick={() =>
              inputRef.current?.click()
            }
          >
            <ReplaceIcon />

            <span>
              {pdf
                ? 'Sostituisci PDF'
                : 'Apri PDF'}
            </span>
          </button>

          <button
            className="primary-button compact-button"
            type="button"
            disabled={
              busy ||
              !pdf ||
              selectedCount === 0
            }
            aria-label="Esporta immagini"
            onClick={() =>
              void exportImages()
            }
          >
            <ToolIcon id="pdf-to-images" />

            <span>
              {exporting
                ? 'Esportazione...'
                : 'Esporta'}
            </span>
          </button>
            </>
          )}
        </div>
      </WorkspaceHeader>

      <div
        className={[
          'pdf-images-workspace',
          !pdf
            ? 'ui-empty-workspace'
            : '',
          dragging
            ? 'is-dragging'
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
          setDragging(true);
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

          setDragging(true);
        }}
        onDragLeave={(event) => {
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
          if (
            !dataTransferHasFiles(
              event.dataTransfer,
            )
          ) {
            return;
          }

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
        <div className="pdf-images-content">
          <WorkspaceIntro
            eyebrow="PDF in immagini"
            title="Converti il PDF in immagini"
            description="Converti le pagine in PNG o JPEG e scegli la risoluzione prima di esportarle."
          />

          {!pdf ? (
            <section
              className={[
                'pdf-images-empty',
                dragging
                  ? 'is-active'
                  : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="pdf-images-empty-icon">
                <DocumentIcon />
              </div>

              <strong>
                {loading
                  ? 'Apertura documento...'
                  : 'Trascina qui un PDF'}
              </strong>

              <span>
                Le pagine verranno mostrate
                prima dell'esportazione.
              </span>

              <button
                className="primary-button"
                type="button"
                disabled={loading}
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                Scegli PDF
              </button>
            </section>
          ) : (
            <>
              <section className="pdf-images-document-bar">
                <div className="pdf-images-document-icon">
                  <DocumentIcon />
                </div>

                <div className="pdf-images-document-copy">
                  <strong
                    title={pdf.name}
                  >
                    {pdf.name}
                  </strong>

                  <span>
                    {pdf.document.numPages}
                    {' '}
                    {pdf.document.numPages === 1
                      ? 'pagina'
                      : 'pagine'}
                    {' · '}
                    {formatBytes(
                      pdf.size,
                    )}
                  </span>

                  <small>
                    Nessun upload
                  </small>
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    inputRef.current?.click()
                  }
                >
                  Sostituisci PDF
                </button>
              </section>

              <div className="pdf-images-layout">
                <section className="pdf-images-pages-panel">
                  <div className="pdf-images-section-header">
                    <div>
                      <p className="pdf-images-kicker">
                        Pagine
                      </p>

                      <h2>
                        Scegli cosa esportare
                      </h2>
                    </div>

                    <div className="pdf-images-selection-actions">
                      <span>
                        {selectedCount}
                        {' / '}
                        {pdf.document.numPages}
                        {' selezionate'}
                      </span>

                      <button
                        type="button"
                        disabled={
                          busy ||
                          selectedCount ===
                            pdf.document
                              .numPages
                        }
                        onClick={selectAll}
                      >
                        Tutte
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy ||
                          selectedCount === 0
                        }
                        onClick={selectNone}
                      >
                        Nessuna
                      </button>
                    </div>
                  </div>

                  <div className="pdf-images-page-grid">
                    {Array.from(
                      {
                        length:
                          pdf.document
                            .numPages,
                      },
                      (
                        _,
                        pageIndex,
                      ) => {
                        const isSelected =
                          selected.has(
                            pageIndex,
                          );

                        return (
                          <button
                            key={pageIndex}
                            className={[
                              'pdf-images-page-card',
                              isSelected
                                ? 'is-selected'
                                : '',
                            ].filter(Boolean).join(' ')}
                            type="button"
                            aria-pressed={
                              isSelected
                            }
                            disabled={busy}
                            onClick={() =>
                              togglePage(
                                pageIndex,
                              )
                            }
                          >
                            <SplitPdfPagePreview
                              document={
                                pdf.document
                              }
                              pageNumber={
                                pageIndex + 1
                              }
                            />

                            <span className="pdf-images-page-copy">
                              <strong>
                                Pagina{' '}
                                {pageIndex + 1}
                              </strong>

                              <span>
                                {isSelected
                                  ? 'Selezionata'
                                  : 'Esclusa'}
                              </span>
                            </span>

                            <span
                              className="pdf-images-check"
                              aria-hidden="true"
                            >
                              {isSelected
                                ? '✓'
                                : ''}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>

                <aside className="pdf-images-settings">
                  <div className="pdf-images-section-header">
                    <div>
                      <p className="pdf-images-kicker">
                        Esportazione
                      </p>

                      <h2>
                        Scegli il formato
                      </h2>
                    </div>
                  </div>

                  <div
                    className="pdf-images-format-grid"
                    role="group"
                    aria-label="Formato delle immagini"
                  >
                    <button
                      type="button"
                      className={[
                        'pdf-images-format-card',
                        format === 'png'
                          ? 'is-active'
                          : '',
                      ].filter(Boolean).join(' ')}
                      disabled={busy}
                      aria-pressed={format === 'png'}
                      onClick={() => {
                        setFormat('png');
                        invalidateResults();
                      }}
                    >
                      <span className="ux-title-row">
                        <strong>
                          PNG
                        </strong>

                        <em className="ux-badge">
                          Documenti
                        </em>
                      </span>

                      <small>
                        Ideale per testo, scansioni,
                        schermate e grafica nitida.
                      </small>
                    </button>

                    <button
                      type="button"
                      className={[
                        'pdf-images-format-card',
                        format === 'jpeg'
                          ? 'is-active'
                          : '',
                      ].filter(Boolean).join(' ')}
                      disabled={busy}
                      aria-pressed={format === 'jpeg'}
                      onClick={() => {
                        setFormat('jpeg');
                        invalidateResults();
                      }}
                    >
                      <span className="ux-title-row">
                        <strong>
                          JPEG
                        </strong>

                        <em className="ux-badge is-neutral">
                          Più leggero
                        </em>
                      </span>

                      <small>
                        Ideale per fotografie e quando
                        vuoi file generalmente più piccoli.
                      </small>
                    </button>
                  </div>

<details className="ux-advanced">
                    <summary>
                      <span>
                        <strong>
                          Impostazioni avanzate
                        </strong>

                        <small>
                          Risoluzione {dpi} DPI
                          {format === 'jpeg'
                            ? ` · qualità ${Math.round(
                                jpegQuality * 100,
                              )}%`
                            : ''}
                        </small>
                      </span>

                      <span className="ux-advanced-chevron" aria-hidden="true" />
                    </summary>

                    <div className="ux-advanced-body">
                      <div className="pdf-images-field">
                        <span className="pdf-images-field-line">
                          <span>
                            Risoluzione
                          </span>

                          <strong>
                            {dpi} DPI
                          </strong>
                        </span>

                        <div className="pdf-images-resolution-grid">
                          {RESOLUTION_SCALES.map(
                            (
                              resolutionScale,
                            ) => (
                              <button
                                key={
                                  resolutionScale
                                }
                                type="button"
                                className={
                                  scale ===
                                  resolutionScale
                                    ? 'is-active'
                                    : undefined
                                }
                                disabled={busy}
                                onClick={() => {
                                  setScale(
                                    resolutionScale,
                                  );

                                  invalidateResults();
                                }}
                              >
                                <strong>
                                  {pdfToImagesDpi(
                                    resolutionScale,
                                  )}
                                </strong>

                                <small>
                                  {resolutionScale === 2
                                    ? 'Consigliato'
                                    : 'DPI'}
                                </small>
                              </button>
                            ),
                          )}
                        </div>

                        <small>
                          144 DPI è un buon equilibrio
                          tra nitidezza, peso e velocità.
                        </small>
                      </div>

                      {format === 'jpeg' && (
                        <label className="pdf-images-field">
                          <span className="pdf-images-field-line">
                            <span>
                              Qualità JPEG
                            </span>

                            <strong>
                              {Math.round(
                                jpegQuality *
                                  100,
                              )}
                              %
                            </strong>
                          </span>

                          <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={jpegQuality}
                            disabled={busy}
                            onChange={(event) => {
                              setJpegQuality(
                                Number(
                                  event.target.value,
                                ),
                              );

                              invalidateResults();
                            }}
                          />

                          <small>
                            Più alta = immagine più fedele.
                            Più bassa = file più leggero.
                          </small>
                        </label>
                      )}
                    </div>
                  </details>

                  <div className="pdf-images-summary">
                    <span>
                      Pronto per l’esportazione
                    </span>

                    <strong>
                      {selectedCount}
                      {' '}
                      {selectedCount === 1
                        ? 'immagine'
                        : 'immagini'}
                    </strong>

                    <small>
                      {format === 'png'
                        ? 'PNG · nitidezza massima'
                        : `JPEG · qualità ${Math.round(
                            jpegQuality * 100,
                          )}%`}
                    </small>

                    <small>
                      {dpi}
                      {' DPI'}

                      {selectedCount > 1
                        ? ' · file ZIP'
                        : ' · file singolo'}
                    </small>

                    {estimate && (
                      <small>
                        Prima pagina:
                        {' '}
                        {estimate.width}
                        ×
                        {estimate.height}
                        {' px'}
                      </small>
                    )}
                  </div>

                  {exporting && progress && (
                    <div className="pdf-images-progress">
                      <div className="pdf-images-progress-line">
                        <span>
                          Preparazione immagini
                        </span>

                        <strong>
                          {progress.completed}
                          {' / '}
                          {progress.total}
                        </strong>
                      </div>

                      <div className="pdf-images-progress-track">
                        <i
                          style={{
                            width:
                              `${progressPercent}%`,
                          }}
                        />
                      </div>

                      <small>
                        {progressPercent}
                        %
                      </small>
                    </div>
                  )}

                  <button
                    className="primary-button pdf-images-export"
                    type="button"
                    disabled={
                      busy ||
                      selectedCount === 0
                    }
                    onClick={() =>
                      void exportImages()
                    }
                  >
                    <ToolIcon id="pdf-to-images" />

                    <span>
                      {exporting
                        ? 'Preparazione...'
                        : selectedCount === 1
                          ? 'Esporta immagine'
                          : `Esporta ${selectedCount} immagini`}
                    </span>
                  </button>
                </aside>
              </div>
            </>
          )}

          {error && (
            <div
              className="pdf-images-message is-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {results && pdf && (
            <section className="pdf-images-result">
              <div className="pdf-images-result-heading">
                <div>
                  <p className="pdf-images-kicker">
                    Completato
                  </p>

                  <h2>
                    {results.length === 1
                      ? 'L’immagine è pronta.'
                      : 'Le immagini sono pronte.'}
                  </h2>

                  <span>
                    {results.length}
                    {' '}
                    {results.length === 1
                      ? 'file'
                      : 'file'}
                    {' · '}
                    {formatBytes(
                      totalResultSize,
                    )}
                  </span>
                </div>

                {results.length === 1 ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      downloadImage(
                        results[0],
                      )
                    }
                  >
                    <DownloadIcon />

                    <span>
                      Scarica immagine
                    </span>
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={zipping}
                    onClick={() =>
                      void downloadZip()
                    }
                  >
                    <DownloadIcon />

                    <span>
                      {zipping
                        ? 'Creazione ZIP...'
                        : 'Scarica ZIP'}
                    </span>
                  </button>
                )}
              </div>

              <div className="pdf-images-result-list">
                {results.map(
                  (image) => (
                    <article
                      key={
                        image.pageIndex
                      }
                      className="pdf-images-result-item"
                    >
                      <span className="pdf-images-result-index">
                        {image.pageIndex + 1}
                      </span>

                      <div>
                        <strong>
                          {imageFileName(
                            pdf.name,
                            image.pageIndex,
                            pdf.document
                              .numPages,
                            image.format,
                          )}
                        </strong>

                        <span>
                          {image.width}
                          ×
                          {image.height}
                          {' px · '}
                          {formatBytes(
                            image.bytes
                              .byteLength,
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label={
                          `Scarica pagina ${
                            image.pageIndex +
                            1
                          }`
                        }
                        onClick={() =>
                          downloadImage(
                            image,
                          )
                        }
                      >
                        <DownloadIcon />

                        <span>
                          Scarica
                        </span>
                      </button>
                    </article>
                  ),
                )}
              </div>
            </section>
          )}

          <div className="pdf-images-privacy">
            <ShieldIcon />

            <span>
              Nessun upload. PDF, anteprime,
              immagini esportate e ZIP restano
              sul dispositivo.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
