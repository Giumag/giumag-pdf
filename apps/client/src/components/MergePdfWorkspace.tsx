import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrowserPdfEngine } from '@giumag/pdf-engine';
import type { LoadedPdf } from '../lib/pdf';
import { formatBytes, loadPdfFile } from '../lib/pdf';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentIcon,
  DownloadIcon,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
} from './Icons';
import { MergePdfPreview } from './MergePdfPreview';
interface MergePdfWorkspaceProps {
  onClose: () => void;
}

interface MergeItem {
  id: string;
  pdf: LoadedPdf;
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

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  const blob = new Blob([copy.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function outputName(items: MergeItem[]) {
  const firstName = items[0]?.pdf.name.replace(/\.pdf$/i, '') || 'documents';
  return `${firstName}-unito.pdf`;
}

function acceptsPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function dataTransferHasFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes('Files');
}

export function MergePdfWorkspace({ onClose }: MergePdfWorkspaceProps) {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [externalDragging, setExternalDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemCounterRef = useRef(0);
  const itemsRef = useRef<MergeItem[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      for (const item of itemsRef.current) {
        void item.pdf.document.loadingTask.destroy();
      }
    };
  }, []);

  const totalPages = useMemo(
    () => items.reduce((sum, item) => sum + item.pdf.document.numPages, 0),
    [items],
  );

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + item.pdf.size, 0),
    [items],
  );

  function replaceItems(nextItems: MergeItem[]) {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }

  async function addFiles(files: File[]) {
    const pdfFiles = files.filter(acceptsPdf);
    const unsupportedCount = files.length - pdfFiles.length;

    if (pdfFiles.length === 0) {
      setError('Seleziona uno o più documenti PDF.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    const loadedItems: MergeItem[] = [];
    const errors: string[] = [];

    try {
      for (const file of pdfFiles) {
        try {
          const pdf = await loadPdfFile(file);

          const item: MergeItem = {
            id: `merge-document-${Date.now()}-${itemCounterRef.current++}`,
            pdf,
          };

          if (!mountedRef.current) {
            await pdf.document.loadingTask.destroy();
            continue;
          }

          loadedItems.push(item);
        } catch (caught) {
          const message = caught instanceof Error
            ? caught.message
            : 'Impossibile aprire questo PDF.';

          errors.push(`${file.name}: ${message}`);
        }
      }

      if (!mountedRef.current) return;

      if (loadedItems.length > 0) {
        replaceItems([...itemsRef.current, ...loadedItems]);

        const documentLabel = loadedItems.length === 1 ? 'documento aggiunto' : 'documenti aggiunti';
        setStatusMessage(`${loadedItems.length} ${documentLabel} localmente.`);
      }

      if (unsupportedCount > 0) {
        errors.push(
          `${unsupportedCount} ${unsupportedCount === 1 ? 'file non PDF è stato ignorato' : 'file non PDF sono stati ignorati'}.`,
        );
      }

      if (errors.length > 0) {
        setError(errors.join(' '));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  async function removeItem(id: string) {
    const item = itemsRef.current.find((candidate) => candidate.id === id);
    if (!item) return;

    replaceItems(itemsRef.current.filter((candidate) => candidate.id !== id));

    await item.pdf.document.loadingTask.destroy();

    setError(null);
    setStatusMessage("Documento rimosso dall'elenco di unione.");
  }

  function moveItem(id: string, direction: -1 | 1) {
    const current = itemsRef.current;
    const index = current.findIndex((item) => item.id === id);
    const nextIndex = index + direction;

    if (
      index < 0 ||
      nextIndex < 0 ||
      nextIndex >= current.length
    ) {
      return;
    }

    const next = [...current];

    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

    replaceItems(next);
    setStatusMessage(null);
  }

  function dropItem(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    const current = itemsRef.current;
    const movingItem = current.find((item) => item.id === draggingId);

    if (!movingItem) return;

    const remaining = current.filter((item) => item.id !== draggingId);
    const targetIndex = remaining.findIndex((item) => item.id === targetId);

    if (targetIndex < 0) return;

    const next = [...remaining];

    next.splice(targetIndex, 0, movingItem);

    replaceItems(next);
    setDraggingId(null);
    setDropTargetId(null);
    setStatusMessage(null);
  }

  async function mergeAndExport() {
    if (itemsRef.current.length < 2) {
      setError('Aggiungi almeno due documenti PDF prima di unirli.');
      return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);

    try {
      const engine = await getPdfEngine();

      const bytes = await engine.merge(
        itemsRef.current.map((item) => item.pdf.bytes),
      );

      downloadPdf(bytes, outputName(itemsRef.current));

      setStatusMessage(
        `${itemsRef.current.length} documenti uniti ed esportati localmente.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile unire questi documenti PDF.',
      );
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  const controlsDisabled = loading || busy;

  return (
    <main className="workspace-shell merge-shell">
      <header
        className={`workspace-topbar glass-surface coherence-topbar${items.length === 0 ? ' is-empty' : ''}`}
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

        {items.length > 0 && (
<div className="document-title">
          <strong>Unisci PDF</strong>
          <span>
            <ShieldIcon />
            Area di lavoro locale · {items.length} documenti · {totalPages} pagine
          </span>
        </div>
        )}

        <div className="topbar-actions">
<input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);

              if (files.length > 0) {
                void addFiles(files);
              }

              event.currentTarget.value = '';
            }}
          />

          {items.length === 0 ? (
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
            onClick={() => fileInputRef.current?.click()}
          >
            <PlusIcon />
            <span>Aggiungi PDF</span>
          </button>

          <button
            className="primary-button compact-button"
            type="button"
            disabled={controlsDisabled || items.length < 2}
            onClick={() => void mergeAndExport()}
          >
            <DownloadIcon />
            <span>{busy ? 'Unione...' : 'Unisci PDF'}</span>
          </button>
            </>
          )}
        </div>
      </header>

      <div
        className={`merge-workspace${externalDragging ? ' merge-workspace-dragging' : ''}`}
        onDragEnter={(event) => {
          if (!dataTransferHasFiles(event.dataTransfer)) return;
          event.preventDefault();
          setExternalDragging(true);
        }}
        onDragOver={(event) => {
          if (!dataTransferHasFiles(event.dataTransfer)) return;
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
          if (!dataTransferHasFiles(event.dataTransfer)) return;

          event.preventDefault();
          setExternalDragging(false);

          const files = Array.from(event.dataTransfer.files);

          if (files.length > 0) {
            void addFiles(files);
          }
        }}
      >
        <div className="merge-content">
          <section className="merge-heading">
            <div>
              <p className="merge-kicker">Unisci PDF</p>
              <h1 className="merge-title">Unisci i tuoi PDF</h1>
            </div>

            <p className="merge-description">
              Ordina due o più documenti e crea un unico PDF direttamente sul dispositivo.
            </p>
          </section>

          {items.length === 0 ? (
            <section
              className={`merge-empty-dropzone${externalDragging ? ' is-dragging' : ''}`}
              aria-label="Aggiungi documenti PDF"
            >
              <div className="merge-empty-icon" aria-hidden="true">
                <DocumentIcon />
                <span className="merge-empty-plus"><PlusIcon /></span>
              </div>

              <div className="merge-empty-copy">
                <strong>{loading ? 'Apertura documenti...' : 'Trascina qui i PDF'}</strong>
                <span>
                  Scegli due o più documenti per creare un unico PDF.
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
              <section className="merge-summary" aria-label="Riepilogo unione">
                <div className="merge-summary-card">
                  <span>Documenti</span>
                  <strong>{items.length}</strong>
                </div>

                <div className="merge-summary-card">
                  <span>Pagine</span>
                  <strong>{totalPages}</strong>
                </div>

                <div className="merge-summary-card">
                  <span>Dimensione totale</span>
                  <strong>{formatBytes(totalSize)}</strong>
                </div>
              </section>

              <section className="merge-list-section" aria-labelledby="merge-order-title">
                <div className="merge-list-heading">
                  <div>
                    <p className="merge-list-kicker">Ordine documenti</p>
                    <h2 id="merge-order-title">Dal primo all'ultimo</h2>
                  </div>

                  <span>
                    Trascina i documenti oppure usa i controlli con le frecce.
                  </span>
                </div>

                <div className="merge-document-list">
                  {items.map((item, index) => (
                    <article
                      key={item.id}
                      className={[
                        'merge-document-card',
                        draggingId === item.id ? 'is-dragging' : '',
                        dropTargetId === item.id ? 'is-drop-target' : '',
                      ].filter(Boolean).join(' ')}
                      draggable={!controlsDisabled}
                      onDragStart={(event) => {
                        setDraggingId(item.id);
                        setDropTargetId(null);

                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragOver={(event) => {
                        if (!draggingId || draggingId === item.id) return;

                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDropTargetId(item.id);
                      }}
                      onDragLeave={() => {
                        if (dropTargetId === item.id) {
                          setDropTargetId(null);
                        }
                      }}
                      onDrop={(event) => {
                        if (!draggingId) return;

                        event.preventDefault();
                        event.stopPropagation();

                        dropItem(item.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTargetId(null);
                      }}
                    >
                      <div className="merge-order-badge" aria-label={`Posizione ${index + 1}`}>
                        {index + 1}
                      </div>

                      <MergePdfPreview
                        document={item.pdf.document}
                        fileName={item.pdf.name}
                      />

                      <div className="merge-file-copy">
                        <strong title={item.pdf.name}>
                          {item.pdf.name}
                        </strong>

                        <span>
                          {item.pdf.document.numPages}
                          {' '}
                          {item.pdf.document.numPages === 1 ? 'pagina' : 'pagine'}
                          {' · '}
                          {formatBytes(item.pdf.size)}
                        </span>

                        <small>Memorizzato ed elaborato localmente</small>
                      </div>

                      <div className="merge-file-actions">
                        <button
                          type="button"
                          className="merge-icon-button"
                          disabled={controlsDisabled || index === 0}
                          onClick={() => moveItem(item.id, -1)}
                          title="Sposta il documento prima"
                          aria-label={`Sposta ${item.pdf.name} prima`}
                        >
                          <ChevronLeftIcon />
                        </button>

                        <button
                          type="button"
                          className="merge-icon-button"
                          disabled={controlsDisabled || index === items.length - 1}
                          onClick={() => moveItem(item.id, 1)}
                          title="Sposta il documento dopo"
                          aria-label={`Sposta ${item.pdf.name} dopo`}
                        >
                          <ChevronRightIcon />
                        </button>

                        <button
                          type="button"
                          className="merge-icon-button merge-remove-button"
                          disabled={controlsDisabled}
                          onClick={() => void removeItem(item.id)}
                          title="Rimuovi documento"
                          aria-label={`Rimuovi ${item.pdf.name}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section
                className={`merge-add-dropzone${externalDragging ? ' is-dragging' : ''}`}
                aria-label="Aggiungi altri documenti PDF"
              >
                <div>
                  <PlusIcon />
                  <span>
                    {loading ? 'Apertura documenti...' : "Trascina altri PDF in qualsiasi punto di quest'area di lavoro"}
                  </span>
                </div>

                <button
                  className="secondary-button compact-button"
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusIcon />
                  <span>Aggiungi PDF</span>
                </button>
              </section>
            </>
          )}

          {error && (
            <div className="merge-message merge-error" role="alert">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="merge-message merge-success" role="status">
              {statusMessage}
            </div>
          )}

          <div className="merge-privacy-note">
            <ShieldIcon />
            <span>Nessun caricamento. Apertura, ordinamento e unione dei PDF avvengono sul dispositivo.</span>
          </div>
        </div>
      </div>
    </main>
  );
}