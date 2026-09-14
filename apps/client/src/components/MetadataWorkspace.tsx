import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  BrowserPdfEngine,
  type PdfMetadataSummary,
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

interface MetadataWorkspaceProps {
  onClose: () => void;
}

interface MetadataResult {
  bytes: Uint8Array;
}

interface MetadataRow {
  label: string;
  value: string;
}

const engine =
  new BrowserPdfEngine();

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

function formatMetadataDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'it-IT',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}

function metadataRows(
  metadata: PdfMetadataSummary,
): MetadataRow[] {
  const rows: MetadataRow[] = [];

  const entries: Array<
    [
      string,
      string | undefined,
    ]
  > = [
    [
      'Titolo',
      metadata.title,
    ],
    [
      'Autore',
      metadata.author,
    ],
    [
      'Oggetto',
      metadata.subject,
    ],
    [
      'Parole chiave',
      metadata.keywords,
    ],
    [
      'Creatore',
      metadata.creator,
    ],
    [
      'Produttore',
      metadata.producer,
    ],
    [
      'Data di creazione',
      metadata.creationDate
        ? formatMetadataDate(
            metadata.creationDate,
          )
        : undefined,
    ],
    [
      'Ultima modifica',
      metadata.modificationDate
        ? formatMetadataDate(
            metadata.modificationDate,
          )
        : undefined,
    ],
  ];

  for (
    const [label, value]
    of entries
  ) {
    if (value) {
      rows.push({
        label,
        value,
      });
    }
  }

  const knownInfoCount =
    entries.filter(
      ([, value]) =>
        Boolean(value),
    ).length;

  const additionalInfo =
    Math.max(
      0,
      metadata.infoFieldCount -
        knownInfoCount,
    );

  if (additionalInfo > 0) {
    rows.push({
      label:
        'Altre proprietà',
      value:
        `${additionalInfo} ${
          additionalInfo === 1
            ? 'campo'
            : 'campi'
        }`,
    });
  }

  if (
    metadata.xmpMetadataCount >
    0
  ) {
    rows.push({
      label:
        'Metadati XMP',
      value:
        `${metadata.xmpMetadataCount} ${
          metadata.xmpMetadataCount ===
          1
            ? 'blocco'
            : 'blocchi'
        }`,
    });
  }

  if (
    metadata.hasDocumentId
  ) {
    rows.push({
      label:
        'Identificatore documento',
      value:
        'Presente',
    });
  }

  return rows;
}

export function MetadataWorkspace({
  onClose,
}: MetadataWorkspaceProps) {
  const [pdf, setPdf] =
    useState<LoadedPdf | null>(
      null,
    );

  const [
    metadata,
    setMetadata,
  ] =
    useState<PdfMetadataSummary | null>(
      null,
    );

  const [result, setResult] =
    useState<MetadataResult | null>(
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
    setMetadata(null);
    setResult(null);

    try {
      const loaded =
        await loadPdfFile(file);

      const inspected =
        await engine.inspectMetadata(
          loaded.bytes,
        );

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
      setMetadata(inspected);

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
          : 'Impossibile controllare questo PDF.',
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

  async function cleanMetadata() {
    const currentPdf =
      pdfRef.current;

    if (!currentPdf) {
      setError(
        'Apri un documento PDF prima di rimuovere i metadati.',
      );

      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const bytes =
        await engine.removeMetadata(
          currentPdf.bytes,
        );

      const verification =
        await engine.inspectMetadata(
          bytes,
        );

      if (
        verification.infoFieldCount !==
          0 ||
        verification.xmpMetadataCount !==
          0 ||
        verification.hasDocumentId
      ) {
        throw new Error(
          'La verifica finale ha rilevato metadati ancora presenti.',
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setResult({
        bytes,
      });
    }
    catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile rimuovere i metadati.',
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
      `${baseFileName(pdf.name)}-senza-metadati.pdf`,
    );
  }

  const pageCount =
    pdf?.document.numPages ?? 0;

  const controlsDisabled =
    loading || busy;

  const rows =
    metadata
      ? metadataRows(metadata)
      : [];

  const hasMetadata =
    rows.length > 0;

  return (
    <main className="workspace-shell metadata-shell">
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
              Rimuovi metadati
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

              {hasMetadata ? (
                <button
                  className="primary-button compact-button"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() =>
                    void cleanMetadata()
                  }
                >
                  <ToolIcon id="metadata" />
                  <span>
                    {busy
                      ? 'Pulizia...'
                      : 'Rimuovi metadati'}
                  </span>
                </button>
              ) : null}
            </>
          )}
        </div>
      </WorkspaceHeader>

      <div
        className={`metadata-workspace ${
          externalDragging
            ? 'metadata-workspace-dragging'
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
        <div className="metadata-content">
                    <WorkspaceIntro
            eyebrow="Rimuovi metadati"
            title="Controlla cosa nasconde il PDF"
            description="Individua proprietà, metadati XMP e identificatori del file, poi crea una copia pulita."
          />

          {!pdf ? (
            <section
              className={`metadata-dropzone ${
                externalDragging
                  ? 'is-dragging'
                  : ''
              }`}
            >
              <div className="metadata-empty-icon">
                <DocumentIcon />

                <span className="metadata-empty-badge">
                  <ToolIcon id="metadata" />
                </span>
              </div>

              <div className="metadata-empty-copy">
                <strong>
                  Apri il PDF da controllare
                </strong>

                <span>
                  L'analisi avviene interamente sul dispositivo.
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
                  ? 'Analisi...'
                  : 'Scegli PDF'}
              </button>
            </section>
          ) : (
            <>
              <section className="metadata-document-card">
                <div className="metadata-document-icon">
                  <DocumentIcon />
                </div>

                <div className="metadata-document-copy">
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
                    Analisi completata localmente.
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

              <section className="metadata-scan-card">
                <div className="metadata-section-heading">
                  <div>
                    <p className="metadata-kicker">
                      Analisi
                    </p>

                    <h2>
                      {hasMetadata
                        ? `${rows.length} ${
                            rows.length === 1
                              ? 'elemento rilevato'
                              : 'elementi rilevati'
                          }`
                        : 'Nessun metadato rilevato'}
                    </h2>
                  </div>

                  <span
                    className={`ux-badge ${
                      hasMetadata
                        ? ''
                        : 'is-neutral'
                    }`}
                  >
                    {hasMetadata
                      ? 'Da rimuovere'
                      : 'Già pulito'}
                  </span>
                </div>

                {hasMetadata ? (
                  <div className="metadata-list">
                    {rows.map(
                      (row) => (
                        <div
                          className="metadata-row"
                          key={row.label}
                        >
                          <span>
                            {row.label}
                          </span>

                          <strong>
                            {row.value}
                          </strong>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="metadata-clean-state">
                    <ShieldIcon />

                    <div>
                      <strong>
                        Il controllo non ha trovato informazioni da eliminare.
                      </strong>

                      <span>
                        Proprietà documento, XMP e identificatore
                        risultano già assenti.
                      </span>
                    </div>
                  </div>
                )}

                <div className="metadata-scope-note">
                  <ShieldIcon />

                  <span>
                    Vengono rimossi i dati descrittivi e identificativi.
                    Pagine, testo visibile, immagini, moduli e annotazioni
                    restano invariati.
                  </span>
                </div>
              </section>

              {hasMetadata ? (
                <section className="metadata-action-panel">
                  <div>
                    <p className="metadata-kicker">
                      Privacy
                    </p>

                    <h2>
                      Crea una copia pulita
                    </h2>

                    <p>
                      Giumag PDF rimuove le proprietà del documento,
                      i blocchi XMP e l'identificatore interno, poi
                      verifica automaticamente il risultato.
                    </p>
                  </div>

                  <button
                    className="primary-button metadata-main-action"
                    type="button"
                    disabled={controlsDisabled}
                    data-auto-advance-action="true"
                    onClick={() =>
                      void cleanMetadata()
                    }
                  >
                    <ToolIcon id="metadata" />

                    <span>
                      {busy
                        ? 'Pulizia...'
                        : 'Rimuovi metadati'}
                    </span>
                  </button>
                </section>
              ) : null}

              {error ? (
                <div className="metadata-message metadata-error">
                  {error}
                </div>
              ) : null}

              {result ? (
                <section
                  className="metadata-result"
                  data-auto-advance-target="true"
                >
                  <div>
                    <p className="metadata-kicker">
                      Verificato
                    </p>

                    <h2>
                      PDF senza metadati
                    </h2>

                    <span>
                      Controllo finale superato
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

              <div className="metadata-privacy">
                <ShieldIcon />

                <span>
                  Il documento non viene caricato su server esterni.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}