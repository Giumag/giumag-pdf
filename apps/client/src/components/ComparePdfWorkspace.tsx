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
  comparePdfDocuments,
  type ComparePageResult,
  type ComparePdfProgress,
} from '../lib/compare-pdf';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentIcon,
  ReplaceIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';

import {
  ComparePdfPagePane,
} from './ComparePdfPagePane';

import {
  WorkspaceHeader,
  WorkspaceIntro,
} from './ui/WorkspaceChrome';

interface ComparePdfWorkspaceProps {
  onClose: () => void;
}

type Side =
  | 'left'
  | 'right';

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

function statusLabel(
  result: ComparePageResult,
) {
  switch (result.status) {
    case 'same':
      return 'Identica';

    case 'changed':
      return 'Modificata';

    case 'only-left':
      return 'Solo nel PDF A';

    case 'only-right':
      return 'Solo nel PDF B';
  }
}

function percentLabel(
  value: number,
) {
  if (value === 0) {
    return '0%';
  }

  if (value < 0.01) {
    return '<0,01%';
  }

  if (value < 1) {
    return `${value
      .toFixed(2)
      .replace(
        '.',
        ',',
      )}%`;
  }

  return `${value
    .toFixed(1)
    .replace(
      '.',
      ',',
    )}%`;
}

function compareSeverityClass(
  result: ComparePageResult,
) {
  if (
    result.status ===
    'same'
  ) {
    return 'severity-same';
  }

  if (
    result.status ===
      'only-left' ||
    result.status ===
      'only-right'
  ) {
    return 'severity-structural';
  }

  const value =
    result.differencePercent;

  if (value < 0.05) {
    return 'severity-trace';
  }

  if (value < 0.5) {
    return 'severity-low';
  }

  if (value < 5) {
    return 'severity-medium';
  }

  if (value < 25) {
    return 'severity-high';
  }

  return 'severity-critical';
}

function compareSeverityLabel(
  result: ComparePageResult,
) {
  if (
    result.status !==
    'changed'
  ) {
    return '';
  }

  const value =
    result.differencePercent;

  if (value < 0.05) {
    return 'Minima';
  }

  if (value < 0.5) {
    return 'Lieve';
  }

  if (value < 5) {
    return 'Media';
  }

  if (value < 25) {
    return 'Alta';
  }

  return 'Molto alta';
}
function progressLabel(
  progress: ComparePdfProgress,
) {
  switch (progress.phase) {
    case 'left':
      return 'Preparo PDF A…';

    case 'right':
      return 'Preparo PDF B…';

    case 'compare':
      return 'Calcolo le differenze…';
  }
}

export function ComparePdfWorkspace({
  onClose,
}: ComparePdfWorkspaceProps) {
  const [
    left,
    setLeft,
  ] =
    useState<LoadedPdf | null>(
      null,
    );

  const [
    right,
    setRight,
  ] =
    useState<LoadedPdf | null>(
      null,
    );

  const [
    results,
    setResults,
  ] =
    useState<
      ComparePageResult[]
    >([]);

  const [
    activePageIndex,
    setActivePageIndex,
  ] =
    useState(0);

  const [
    loadingSide,
    setLoadingSide,
  ] =
    useState<Side | null>(
      null,
    );

  const [
    comparing,
    setComparing,
  ] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState<
      ComparePdfProgress | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    diffUrl,
    setDiffUrl,
  ] =
    useState<string | null>(
      null,
    );

  const leftInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const rightInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const leftRef =
    useRef<LoadedPdf | null>(
      null,
    );

  const rightRef =
    useRef<LoadedPdf | null>(
      null,
    );

  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      const currentLeft =
        leftRef.current;

      const currentRight =
        rightRef.current;

      leftRef.current =
        null;

      rightRef.current =
        null;

      if (currentLeft) {
        void currentLeft.document
          .loadingTask.destroy();
      }

      if (currentRight) {
        void currentRight.document
          .loadingTask.destroy();
      }
    };
  }, []);

  const activeResult =
    results[
      activePageIndex
    ];

  useEffect(() => {
    if (
      !activeResult?.diffBytes
    ) {
      setDiffUrl(null);
      return;
    }

    const copy =
      new Uint8Array(
        activeResult
          .diffBytes
          .byteLength,
      );

    copy.set(
      activeResult.diffBytes,
    );

    const blob =
      new Blob(
        [copy.buffer],
        {
          type:
            'image/png',
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    setDiffUrl(url);

    return () => {
      URL.revokeObjectURL(
        url,
      );
    };
  }, [
    activeResult,
  ]);

  const pageCount =
    Math.max(
      left?.document.numPages ??
        0,
      right?.document.numPages ??
        0,
    );

  const disabled =
    comparing ||
    loadingSide !== null;

  const sameCount =
    results.filter(
      (page) =>
        page.status ===
        'same',
    ).length;

  const changedCount =
    results.filter(
      (page) =>
        page.status ===
        'changed',
    ).length;

  const missingCount =
    results.filter(
      (page) =>
        page.status ===
          'only-left' ||
        page.status ===
          'only-right',
    ).length;

  function safePage(
    value: number,
  ) {
    if (pageCount <= 0) {
      return;
    }

    setActivePageIndex(
      Math.max(
        0,
        Math.min(
          pageCount - 1,
          value,
        ),
      ),
    );
  }

  async function runComparison(
    currentLeft: LoadedPdf,
    currentRight: LoadedPdf,
  ) {
    setComparing(true);
    setResults([]);
    setActivePageIndex(0);
    setError(null);

    setProgress({
      phase: 'left',
      completed: 0,
      total:
        currentLeft.document
          .numPages,
      percent: 0,
    });

    try {
      const comparison =
        await comparePdfDocuments(
          currentLeft.bytes,
          currentRight.bytes,
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

      setResults(
        comparison,
      );

      setProgress(null);
    } catch (caught) {
      if (
        mountedRef.current
      ) {
        setProgress(null);

        setError(
          caught instanceof Error
            ? caught.message
            : 'Impossibile confrontare i documenti.',
        );
      }
    } finally {
      if (
        mountedRef.current
      ) {
        setComparing(false);
      }
    }
  }

  async function openFile(
    side: Side,
    file: File,
  ) {
    if (disabled) {
      return;
    }

    if (
      !acceptsPdf(file)
    ) {
      setError(
        'Seleziona un documento PDF.',
      );

      return;
    }

    setLoadingSide(side);
    setError(null);
    setResults([]);
    setProgress(null);

    try {
      const loaded =
        await loadPdfFile(file);

      if (
        !mountedRef.current
      ) {
        await loaded.document
          .loadingTask.destroy();

        return;
      }

      let nextLeft =
        leftRef.current;

      let nextRight =
        rightRef.current;

      if (side === 'left') {
        const previous =
          leftRef.current;

        leftRef.current =
          loaded;

        nextLeft =
          loaded;

        setLeft(loaded);

        if (previous) {
          await previous.document
            .loadingTask.destroy();
        }
      } else {
        const previous =
          rightRef.current;

        rightRef.current =
          loaded;

        nextRight =
          loaded;

        setRight(loaded);

        if (previous) {
          await previous.document
            .loadingTask.destroy();
        }
      }

      setActivePageIndex(0);
      setLoadingSide(null);

      if (
        nextLeft &&
        nextRight
      ) {
        await runComparison(
          nextLeft,
          nextRight,
        );
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
        setLoadingSide(null);
      }
    }
  }

  function renderFileSlot(
    side: Side,
    pdf: LoadedPdf | null,
  ) {
    const isLeft =
      side === 'left';

    const inputRef =
      isLeft
        ? leftInputRef
        : rightInputRef;

    return (
      <section
        className={`compare-file-slot${
          pdf
            ? ' has-file'
            : ''
        }`}
      >
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const file =
              event
                .currentTarget
                .files?.[0];

            event.currentTarget.value =
              '';

            if (file) {
              void openFile(
                side,
                file,
              );
            }
          }}
        />

        <div className="compare-file-slot-icon">
          <DocumentIcon />
        </div>

        <div className="compare-file-slot-copy">
          <span>
            {isLeft
              ? 'PDF A'
              : 'PDF B'}
          </span>

          {pdf ? (
            <>
              <strong title={pdf.name}>
                {pdf.name}
              </strong>

              <small>
                {pdf.document.numPages}{' '}
                {pdf.document.numPages ===
                1
                  ? 'pagina'
                  : 'pagine'}
                {' · '}
                {formatBytes(
                  pdf.size,
                )}
              </small>
            </>
          ) : (
            <>
              <strong>
                Scegli il documento
              </strong>

              <small>
                PDF da confrontare
              </small>
            </>
          )}
        </div>

        <button
          type="button"
          className="secondary-button compare-file-button"
          disabled={disabled}
          onClick={() =>
            inputRef.current
              ?.click()
          }
        >
          {pdf ? (
            <ReplaceIcon />
          ) : (
            <DocumentIcon />
          )}

          <span>
            {loadingSide ===
            side
              ? 'Apro…'
              : pdf
                ? 'Sostituisci'
                : 'Scegli PDF'}
          </span>
        </button>
      </section>
    );
  }

  return (
    <main
      className="workspace-shell compare-shell"
      aria-busy={disabled}
    >
      <WorkspaceHeader empty={!left && !right}>
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

        {(left || right) && (
          <div className="document-title compare-document-title">
            <strong>
              Confronta PDF
            </strong>

            <span>
              <ShieldIcon />

              {left && right
                ? 'Confronto visivo locale · 2 PDF'
                : 'Seleziona il secondo PDF'}
            </span>
          </div>
        )}

        <div className="topbar-actions compare-topbar-actions">
          <button
            type="button"
            className="primary-button compact-button compare-recompare-button"
            hidden={!left || !right}
            disabled={disabled}
            onClick={() => {
              const currentLeft =
                leftRef.current;

              const currentRight =
                rightRef.current;

              if (
                currentLeft &&
                currentRight
              ) {
                void runComparison(
                  currentLeft,
                  currentRight,
                );
              }
            }}
          >
            <ToolIcon id="compare" />

            <span>
              {comparing
                ? 'Confronto…'
                : 'Riconfronta'}
            </span>
          </button>

          <button
            type="button"
            className="secondary-button coherence-close-button"
            hidden={Boolean(left && right)}
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>
      </WorkspaceHeader>

      <div className="compare-content">
        <WorkspaceIntro
          eyebrow="Confronta PDF"
          title="Trova cosa è cambiato"
          description="Carica due versioni dello stesso documento. Il confronto viene eseguito localmente, pagina per pagina."
        />

        <div className="compare-file-grid">
          {renderFileSlot(
            'left',
            left,
          )}

          {renderFileSlot(
            'right',
            right,
          )}
        </div>

        {progress && (
          <section
            className="compare-progress-card"
            aria-live="polite"
          >
            <div>
              <strong>
                {progressLabel(
                  progress,
                )}
              </strong>

              <span>
                {progress.percent}%
              </span>
            </div>

            <div
              className="compare-progress-track"
              role="progressbar"
              aria-label="Avanzamento confronto PDF"
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
            className="compare-message compare-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {!left || !right ? (
          <section className="compare-empty-state">
            <div className="compare-empty-icon">
              <ToolIcon id="compare" />
            </div>

            <strong>
              {!left && !right
                ? 'Carica entrambi i documenti'
                : !left
                  ? 'Carica il PDF A'
                  : 'Carica il PDF B'}
            </strong>

            <span>
              {!left && !right
                ? 'Scegli PDF A e PDF B. Il confronto partirà automaticamente.'
                : `Manca solo ${
                    !left
                      ? 'PDF A'
                      : 'PDF B'
                  }. Il confronto partirà automaticamente appena lo carichi.`}
            </span>
          </section>
        ) : results.length === 0 ? (
          <section className="compare-empty-state">
            <div className="compare-empty-icon">
              <ToolIcon id="compare" />
            </div>

            <strong>
              {comparing
                ? 'Confronto in corso…'
                : 'Pronto per confrontare'}
            </strong>

            <span>
              Il risultato apparirà qui.
            </span>
          </section>
        ) : (
          <>
            <section className="compare-summary">
              <div className="compare-summary-item">
                <strong>
                  {sameCount}
                </strong>

                <span>
                  identiche
                </span>
              </div>

              <div className="compare-summary-item">
                <strong>
                  {changedCount}
                </strong>

                <span>
                  modificate
                </span>
              </div>

              <div className="compare-summary-item">
                <strong>
                  {missingCount}
                </strong>

                <span>
                  aggiunte / rimosse
                </span>
              </div>

              <div className="compare-summary-item">
                <strong>
                  {results.length}
                </strong>

                <span>
                  pagine confrontate
                </span>
              </div>
            </section>

            <div
              className="compare-severity-legend"
              aria-label="Intensità delle differenze"
            >
              <span>
                <i className="severity-trace" />
                Minima
              </span>

              <span>
                <i className="severity-low" />
                Lieve
              </span>

              <span>
                <i className="severity-medium" />
                Media
              </span>

              <span>
                <i className="severity-high" />
                Alta
              </span>

              <span>
                <i className="severity-critical" />
                Molto alta
              </span>

              <span>
                <i className="severity-structural" />
                Pagina aggiunta/rimossa
              </span>
            </div>
            <section className="compare-workspace">
              <aside className="compare-page-list">
                {results.map(
                  (
                    result,
                    index,
                  ) => (
                    <button
                      key={
                        result.pageIndex
                      }
                      type="button"
                      className={[
                        'compare-page-list-item',
                        index ===
                          activePageIndex
                          ? 'is-active'
                          : '',
                        `is-${result.status}`,
                        compareSeverityClass(result),
                      ].join(' ')}
                      onClick={() =>
                        safePage(index)
                      }
                    >
                      <span>
                        {index + 1}
                      </span>

                      <div>
                        <strong>
                          Pagina{' '}
                          {index + 1}
                        </strong>

                        <small>
                          {statusLabel(
                            result,
                          )}

                          {result.status ===
                          'changed'
                            ? ` · ${compareSeverityLabel(
                                result,
                              )}`
                            : ''}
                        </small>
                      </div>

                      <em>
                        {percentLabel(
                          result
                            .differencePercent,
                        )}
                      </em>
                    </button>
                  ),
                )}
              </aside>

              <div className="compare-main">
                <div className="compare-navigation glass-surface">
                  <button
                    type="button"
                    className="toolbar-button"
                    aria-label="Pagina precedente"
                    disabled={
                      activePageIndex <=
                      0
                    }
                    onClick={() =>
                      safePage(
                        activePageIndex -
                          1,
                      )
                    }
                  >
                    <ChevronLeftIcon />
                  </button>

                  <div>
                    <strong>
                      Pagina{' '}
                      {activePageIndex +
                        1}
                    </strong>

                    <span>
                      {activeResult
                        ? statusLabel(
                            activeResult,
                          )
                        : ''}
                      {activeResult?.status ===
                      'changed'
                        ? ` · ${percentLabel(
                            activeResult
                              .differencePercent,
                          )} differente`
                        : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="toolbar-button"
                    aria-label="Pagina successiva"
                    disabled={
                      activePageIndex >=
                      pageCount - 1
                    }
                    onClick={() =>
                      safePage(
                        activePageIndex +
                          1,
                      )
                    }
                  >
                    <ChevronRightIcon />
                  </button>
                </div>

                <div className="compare-panes">
                  <ComparePdfPagePane
                    document={
                      left.document
                    }
                    pageNumber={
                      activePageIndex +
                      1
                    }
                    label="PDF A"
                    missing={
                      activePageIndex >=
                      left.document
                        .numPages
                    }
                  />

                  <ComparePdfPagePane
                    document={
                      right.document
                    }
                    pageNumber={
                      activePageIndex +
                      1
                    }
                    label="PDF B"
                    missing={
                      activePageIndex >=
                      right.document
                        .numPages
                    }
                  />
                </div>

                <section className="compare-diff-card">
                  <div className="compare-diff-heading">
                    <div>
                      <p className="compare-kicker">
                        DIFFERENZE
                      </p>

                      <h2>
                        Mappa visiva
                      </h2>
                    </div>

                    {activeResult && (
                      <span
                        className={`compare-status-pill is-${activeResult.status}`}
                      >
                        {statusLabel(
                          activeResult,
                        )}
                      </span>
                    )}
                  </div>

                  {activeResult?.status ===
                  'same' ? (
                    <div className="compare-diff-empty is-same">
                      <strong>
                        Nessuna differenza visiva rilevata.
                      </strong>

                      <span>
                        La pagina risulta identica.
                      </span>
                    </div>
                  ) : activeResult?.status ===
                    'only-left' ? (
                    <div className="compare-diff-empty">
                      <strong>
                        Questa pagina esiste solo nel PDF A.
                      </strong>
                    </div>
                  ) : activeResult?.status ===
                    'only-right' ? (
                    <div className="compare-diff-empty">
                      <strong>
                        Questa pagina esiste solo nel PDF B.
                      </strong>
                    </div>
                  ) : diffUrl ? (
                    <div className="compare-diff-stage">
                      <img
                        src={diffUrl}
                        alt={`Differenze pagina ${activePageIndex + 1}`}
                      />
                    </div>
                  ) : (
                    <div className="compare-diff-empty">
                      Mappa delle differenze non disponibile.
                    </div>
                  )}
                </section>
              </div>
            </section>
          </>
        )}

        <div className="compare-privacy">
          <ShieldIcon />

          <span>
            I documenti restano sul dispositivo.
          </span>
        </div>
      </div>
    </main>
  );
}