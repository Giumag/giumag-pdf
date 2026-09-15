import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrowserPdfEngine, PageRotation, PageTransform } from '@giumag/pdf-engine';
import type { LoadedPdf } from '../lib/pdf';
import { formatBytes } from '../lib/pdf';
import { PdfCanvas } from './PdfCanvas';
import { PdfThumbnail } from './PdfThumbnail';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExtractIcon,
  MinusIcon,
  MoveEarlierIcon,
  MoveLaterIcon,
  PlusIcon,
  RedoIcon,
  ReplaceIcon,
  RotateIcon,
  ShieldIcon,
  TrashIcon,
  UndoIcon,
} from './Icons';
import { WorkspaceHeader } from './ui/WorkspaceChrome';

interface PdfWorkspaceProps {
  pdf: LoadedPdf;
  onClose: () => void;
  onReplace: (file: File) => void;
}

interface WorkspacePage {
  id: string;
  sourceIndex: number;
  rotation: PageRotation;
}

interface HistorySnapshot {
  pages: WorkspacePage[];
  selectedIds: string[];
  activeId: string | null;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const HISTORY_LIMIT = 50;

let pdfEnginePromise: Promise<BrowserPdfEngine> | null = null;

function getPdfEngine(): Promise<BrowserPdfEngine> {
  if (!pdfEnginePromise) {
    pdfEnginePromise = import('@giumag/pdf-engine').then(
      ({ BrowserPdfEngine }) => new BrowserPdfEngine(),
    );
  }

  return pdfEnginePromise;
}

function makeInitialPages(count: number): WorkspacePage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `source-page-${index}`,
    sourceIndex: index,
    rotation: 0,
  }));
}

function transformsFor(pages: WorkspacePage[]): PageTransform[] {
  return pages.map(({ sourceIndex, rotation }) => ({ sourceIndex, rotation }));
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

function outputName(name: string, suffix: string) {
  const base = name.replace(/\.pdf$/i, '') || 'document';
  return `${base}-${suffix}.pdf`;
}

export function PdfWorkspace({ pdf, onClose, onReplace }: PdfWorkspaceProps) {

  const initialPages = useMemo(() => makeInitialPages(pdf.document.numPages), [pdf.document.numPages]);
  const [pages, setPages] = useState<WorkspacePage[]>(initialPages);
  const [activeId, setActiveId] = useState<string | null>(initialPages[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialPages[0] ? [initialPages[0].id] : []);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const [zoom, setZoom] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'export' | 'extract' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const selectionAnchorRef = useRef<string | null>(initialPages[0]?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerScrollRef = useRef<HTMLDivElement>(null);
  const fitRequestRef = useRef(0);

  useEffect(() => {
    const next = makeInitialPages(pdf.document.numPages);
    setPages(next);
    setActiveId(next[0]?.id ?? null);
    setSelectedIds(next[0] ? [next[0].id] : []);
    setPast([]);
    setFuture([]);
    setZoom(1);
    setDraggingId(null);
    setStatusMessage(null);
    selectionAnchorRef.current = next[0]?.id ?? null;
  }, [pdf]);

  const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId));
  const activePage = pages[activeIndex] ?? pages[0];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedPages = useMemo(() => pages.filter((page) => selectedSet.has(page.id)), [pages, selectedSet]);
  const selectionCount = selectedPages.length;
  const canRemove = selectionCount > 0 && selectionCount < pages.length;
  const canMoveEarlier = selectedPages.some((page) => pages.indexOf(page) > 0 && !selectedSet.has(pages[pages.indexOf(page) - 1]?.id));
  const canMoveLater = selectedPages.some((page) => pages.indexOf(page) < pages.length - 1 && !selectedSet.has(pages[pages.indexOf(page) + 1]?.id));

  async function fitActivePageToWidth() {
    const container = viewerScrollRef.current;
    if (!container || !activePage) return;

    const requestId = ++fitRequestRef.current;
    const page = await pdf.document.getPage(activePage.sourceIndex + 1);

    if (requestId !== fitRequestRef.current) return;

    const rotation = (page.rotate + activePage.rotation) % 360;
    const viewport = page.getViewport({ scale: 1, rotation });
    const styles = window.getComputedStyle(container);

    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const availableWidth = Math.max(
      1,
      container.clientWidth - paddingLeft - paddingRight,
    );

    const nextZoom = Math.max(
      MIN_ZOOM,
      Math.min(1, availableWidth / viewport.width),
    );

    setZoom(Number(nextZoom.toFixed(3)));

    window.requestAnimationFrame(() => {
      if (viewerScrollRef.current === container) {
        container.scrollLeft = 0;
      }
    });
  }

  useEffect(() => {
    const container = viewerScrollRef.current;
    if (!container || !activePage) return;

    let frameId = 0;

    function scheduleFit() {
      if (!window.matchMedia('(max-width: 620px)').matches) return;

      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        void fitActivePageToWidth();
      });
    }

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(container);

    scheduleFit();

    return () => {
      window.cancelAnimationFrame(frameId);
      fitRequestRef.current += 1;
      observer.disconnect();
    };
  }, [
    pdf.document,
    activePage?.sourceIndex,
    activePage?.rotation,
  ]);

  function resetZoom() {
    if (window.matchMedia('(max-width: 620px)').matches) {
      void fitActivePageToWidth();
      return;
    }

    setZoom(1);
  }
  function currentSnapshot(): HistorySnapshot {
    return {
      pages: pages.map((page) => ({ ...page })),
      selectedIds: [...selectedIds],
      activeId,
    };
  }

  function commit(nextPages: WorkspacePage[], nextSelectedIds = selectedIds, nextActiveId = activeId) {
    setPast((history) => [...history.slice(-(HISTORY_LIMIT - 1)), currentSnapshot()]);
    setFuture([]);
    setPages(nextPages);
    setSelectedIds(nextSelectedIds);
    setActiveId(nextActiveId);
    setStatusMessage(null);
  }

  function restore(snapshot: HistorySnapshot) {
    setPages(snapshot.pages.map((page) => ({ ...page })));
    setSelectedIds([...snapshot.selectedIds]);
    setActiveId(snapshot.activeId);
    selectionAnchorRef.current = snapshot.activeId;
    setStatusMessage(null);
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([currentSnapshot(), ...future].slice(0, HISTORY_LIMIT));
    restore(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past.slice(-(HISTORY_LIMIT - 1)), currentSnapshot()]);
    restore(next);
  }

  function setSafePage(next: number) {
    if (pages.length === 0) return;
    const index = Math.max(0, Math.min(pages.length - 1, next - 1));
    const page = pages[index];
    setActiveId(page.id);
    selectionAnchorRef.current = page.id;
  }

  function changeZoom(delta: number) {
    setZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((current + delta).toFixed(2)))));
  }

  function selectPage(id: string, index: number, shiftKey: boolean, additive: boolean) {
    setActiveId(id);

    if (shiftKey && selectionAnchorRef.current) {
      const anchorIndex = pages.findIndex((page) => page.id === selectionAnchorRef.current);
      if (anchorIndex >= 0) {
        const start = Math.min(anchorIndex, index);
        const end = Math.max(anchorIndex, index);
        const rangeIds = pages.slice(start, end + 1).map((page) => page.id);
        setSelectedIds(additive ? [...new Set([...selectedIds, ...rangeIds])] : rangeIds);
        return;
      }
    }

    if (additive) {
      setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
      selectionAnchorRef.current = id;
      return;
    }

    setSelectedIds([id]);
    selectionAnchorRef.current = id;
  }

  function rotateSelected() {
    if (selectionCount === 0) return;
    const nextPages = pages.map((page) => selectedSet.has(page.id)
      ? { ...page, rotation: ((page.rotation + 90) % 360) as PageRotation }
      : page);
    commit(nextPages);
  }

  function removeSelected() {
    if (!canRemove) return;
    const oldActiveIndex = activeIndex;
    const nextPages = pages.filter((page) => !selectedSet.has(page.id));
    const nextActive = nextPages[Math.min(oldActiveIndex, nextPages.length - 1)] ?? nextPages[0] ?? null;
    commit(nextPages, nextActive ? [nextActive.id] : [], nextActive?.id ?? null);
    selectionAnchorRef.current = nextActive?.id ?? null;
  }

  function moveSelected(direction: -1 | 1) {
    if (selectionCount === 0) return;
    const nextPages = [...pages];

    if (direction < 0) {
      for (let index = 1; index < nextPages.length; index += 1) {
        if (selectedSet.has(nextPages[index].id) && !selectedSet.has(nextPages[index - 1].id)) {
          [nextPages[index - 1], nextPages[index]] = [nextPages[index], nextPages[index - 1]];
        }
      }
    } else {
      for (let index = nextPages.length - 2; index >= 0; index -= 1) {
        if (selectedSet.has(nextPages[index].id) && !selectedSet.has(nextPages[index + 1].id)) {
          [nextPages[index], nextPages[index + 1]] = [nextPages[index + 1], nextPages[index]];
        }
      }
    }

    if (nextPages.every((page, index) => page.id === pages[index].id)) return;
    commit(nextPages);
  }

  function dropPages(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    const movingIds = selectedSet.has(draggingId)
      ? pages.filter((page) => selectedSet.has(page.id)).map((page) => page.id)
      : [draggingId];
    const movingSet = new Set(movingIds);
    if (movingSet.has(targetId)) return;

    const movingPages = pages.filter((page) => movingSet.has(page.id));
    const remaining = pages.filter((page) => !movingSet.has(page.id));
    const targetIndex = remaining.findIndex((page) => page.id === targetId);
    if (targetIndex < 0) return;

    const nextPages = [
      ...remaining.slice(0, targetIndex),
      ...movingPages,
      ...remaining.slice(targetIndex),
    ];
    const nextSelection = movingPages.map((page) => page.id);
    const nextActiveId = movingSet.has(activeId ?? '') ? activeId : movingPages[0]?.id ?? activeId;
    commit(nextPages, nextSelection, nextActiveId);
    selectionAnchorRef.current = nextActiveId;
  }

  async function exportDocument() {
    setBusyAction('export');
    setStatusMessage(null);
    try {
      const engine = await getPdfEngine();
      const bytes = await engine.organize(pdf.bytes, transformsFor(pages));
      downloadPdf(bytes, outputName(pdf.name, 'organizzato'));
      setStatusMessage('PDF organizzato esportato localmente.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Impossibile esportare questo PDF.');
    } finally {
      setBusyAction(null);
    }
  }

  async function extractSelected() {
    if (selectionCount === 0) return;
    setBusyAction('extract');
    setStatusMessage(null);
    try {
      const engine = await getPdfEngine();
      const bytes = await engine.extract(pdf.bytes, transformsFor(selectedPages));
      downloadPdf(bytes, outputName(pdf.name, selectionCount === 1 ? 'pagina' : 'pagine'));
      setStatusMessage(`${selectionCount} ${selectionCount === 1 ? 'pagina selezionata estratta' : 'pagine selezionate estratte'} localmente.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Impossibile estrarre le pagine selezionate.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="workspace-shell organize-shell">
      <WorkspaceHeader>
        <button className="brand-button" type="button" onClick={onClose} aria-label="Torna alla home di Giumag PDF">
          <span className="brand-mark">G</span>
          <span>Giumag PDF</span>
        </button>

        <div className="document-title" title={pdf.name}>
          <strong>{pdf.name}</strong>
          <span><ShieldIcon /> Documento locale · {pages.length} pagine · {formatBytes(pdf.size)}</span>
        </div>

        <div className="topbar-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onReplace(file);
              event.currentTarget.value = '';
            }}
          />
          <button className="secondary-button compact-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <ReplaceIcon />
            <span>Sostituisci</span>
          </button>
          <button className="primary-button compact-button" type="button" disabled={busyAction !== null} onClick={() => void exportDocument()}>
            <DownloadIcon />
            <span>{busyAction === 'export' ? 'Esportazione...' : 'Esporta PDF'}</span>
          </button>
        </div>
      </WorkspaceHeader>

      <div className="workspace-layout">
        <aside className="thumbnail-sidebar" aria-label="Pagine del documento">
          <div className="sidebar-heading">
            <span>{selectionCount > 1 ? `${selectionCount} selezionate` : 'Pagine'}</span>
            <span className="count-badge">{pages.length}</span>
          </div>

          <p className="organizer-sidebar-helper">
            Seleziona una o più pagine per
            spostarle, ruotarle, estrarle o rimuoverle.
          </p>

          <div className="thumbnail-list">
            {pages.map((page, index) => (
              <PdfThumbnail
                key={page.id}
                document={pdf.document}
                sourcePageNumber={page.sourceIndex + 1}
                displayNumber={index + 1}
                active={page.id === activeId}
                selected={selectedSet.has(page.id)}
                rotation={page.rotation}
                dragging={page.id === draggingId}
                onSelect={(event) => selectPage(page.id, index, event.shiftKey, event.ctrlKey || event.metaKey)}
                onDragStart={(event) => {
                  setDraggingId(page.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', page.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropPages(page.id);
                  setDraggingId(null);
                }}
                onDragEnd={() => setDraggingId(null)}
              />
            ))}
          </div>
        </aside>

        <section className="viewer" aria-label={`Visualizzazione pagina ${activeIndex + 1} di ${pages.length}`}>
          <div className="viewer-toolbar glass-surface" role="toolbar" aria-label="Controlli del visualizzatore PDF">
            <div className="toolbar-group">
              <button type="button" className="toolbar-button" onClick={() => setSafePage(activeIndex)} disabled={activeIndex === 0} aria-label="Pagina precedente">
                <ChevronLeftIcon />
              </button>
              <div className="page-counter">
                <input
                  aria-label="Pagina corrente"
                  inputMode="numeric"
                  value={activeIndex + 1}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.currentTarget.value, 10);
                    if (Number.isFinite(parsed)) setSafePage(parsed);
                  }}
                />
                <span>di {pages.length}</span>
              </div>
              <button type="button" className="toolbar-button" onClick={() => setSafePage(activeIndex + 2)} disabled={activeIndex === pages.length - 1} aria-label="Pagina successiva">
                <ChevronRightIcon />
              </button>
            </div>

            <span className="toolbar-divider" aria-hidden="true" />

            <div className="toolbar-group zoom-controls">
              <button type="button" className="toolbar-button" onClick={() => changeZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} aria-label="Riduci zoom">
                <MinusIcon />
              </button>
              <button type="button" className="zoom-value" onClick={resetZoom} title="Ripristina zoom">{Math.round(zoom * 100)}%</button>
              <button type="button" className="toolbar-button" onClick={() => changeZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label="Aumenta zoom">
                <PlusIcon />
              </button>
            </div>
          </div>

          <div ref={viewerScrollRef} className="viewer-scroll-area organizer-scroll-area">
            {activePage && (
              <PdfCanvas
                document={pdf.document}
                pageNumber={activePage.sourceIndex + 1}
                zoom={zoom}
                rotation={activePage.rotation}
              />
            )}
          </div>

          <div className="organizer-toolbar glass-surface" role="toolbar" aria-label="Controlli organizzazione pagine">
            <span
              className={[
                'selection-pill',
                selectionCount === 0
                  ? 'is-empty'
                  : '',
              ].filter(Boolean).join(' ')}
            >
              {selectionCount === 0
                ? 'Seleziona'
                : selectionCount === 1
                  ? '1 selezionata'
                  : `${selectionCount} selezionate`}
            </span>
            <span className="toolbar-divider" aria-hidden="true" />
            <button type="button" className="organizer-action" disabled={!canMoveEarlier} onClick={() => moveSelected(-1)} title="Sposta prima le pagine selezionate" aria-label="Sposta prima le pagine selezionate">
              <MoveEarlierIcon /><span>Prima</span>
            </button>
            <button type="button" className="organizer-action" disabled={!canMoveLater} onClick={() => moveSelected(1)} title="Sposta dopo le pagine selezionate" aria-label="Sposta dopo le pagine selezionate">
              <MoveLaterIcon /><span>Dopo</span>
            </button>
            <button type="button" className="organizer-action" disabled={selectionCount === 0} onClick={rotateSelected} title="Ruota le pagine selezionate in senso orario" aria-label="Ruota le pagine selezionate">
              <RotateIcon /><span>Ruota</span>
            </button>
            <button type="button" className="organizer-action" disabled={selectionCount === 0 || busyAction !== null} onClick={() => void extractSelected()} title="Estrai le pagine selezionate" aria-label="Estrai le pagine selezionate">
              <ExtractIcon /><span>{busyAction === 'extract' ? 'Estrazione...' : 'Estrai'}</span>
            </button>
            <button type="button" className="organizer-action organizer-danger" disabled={!canRemove} onClick={removeSelected} title={canRemove ? 'Rimuovi le pagine selezionate' : 'Un PDF deve contenere almeno una pagina'} aria-label="Rimuovi le pagine selezionate">
              <TrashIcon /><span>Rimuovi</span>
            </button>
            <span className="toolbar-divider" aria-hidden="true" />
            <button type="button" className="organizer-action icon-only-action" disabled={past.length === 0} onClick={undo} title="Annulla" aria-label="Annulla ultima modifica">
              <UndoIcon /><span className="visually-hidden">Annulla</span>
            </button>
            <button type="button" className="organizer-action icon-only-action" disabled={future.length === 0} onClick={redo} title="Ripeti" aria-label="Ripeti ultima modifica">
              <RedoIcon /><span className="visually-hidden">Ripeti</span>
            </button>
          </div>

          {statusMessage && <div className="workspace-status" role="status">{statusMessage}</div>}
        </section>
      </div>
    </main>
  );
}
