import { useRef, useState } from 'react';
import { UNIVERSAL_TOOLS } from '@giumag/shared';
import type { LoadedPdf } from './lib/pdf';
import { loadPdfFile } from './lib/pdf';
import { PdfWorkspace } from './components/PdfWorkspace';
import { ArrowUpRightIcon, DocumentIcon, LockIcon, ShieldIcon, ToolIcon } from './components/Icons';

export function App() {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function openFile(file: File) {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadPdfFile(file);
      if (pdf) await pdf.document.loadingTask.destroy();
      setPdf(loaded);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open this PDF.');
    } finally {
      setLoading(false);
    }
  }

  async function closeWorkspace() {
    if (pdf) await pdf.document.loadingTask.destroy();
    setPdf(null);
    setError(null);
  }

  if (pdf) {
    return <PdfWorkspace pdf={pdf} onClose={() => void closeWorkspace()} onReplace={(file) => void openFile(file)} />;
  }

  return (
    <div className="home-page">
      <header className="home-nav glass-surface">
        <div className="brand-lockup" aria-label="Giumag PDF">
          <span className="brand-mark">G</span>
          <span className="brand">Giumag PDF</span>
        </div>
        <div className="privacy-badge">
          <ShieldIcon className="inline-icon" />
          <span>On-device processing</span>
        </div>
      </header>

      <main className="home-content">
        <section className="hero">
          <div className="hero-label"><LockIcon className="inline-icon" /> Private by architecture</div>
          <h1>Work with PDFs.<br /><span>Keep them private.</span></h1>
          <p className="lede">
            A fast, local-first PDF workspace for web, desktop and mobile. Your documents stay on your device.
          </p>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void openFile(file);
              event.currentTarget.value = '';
            }}
          />

          <div
            className={`dropzone${dragging ? ' dropzone-active' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void openFile(file);
            }}
          >
            <div className="dropzone-icon" aria-hidden="true"><DocumentIcon /></div>
            <div className="dropzone-copy">
              <strong>{loading ? 'Opening document…' : 'Drop a PDF here'}</strong>
              <span>or choose a document from this device</span>
            </div>
            <button className="primary-button" type="button" disabled={loading} onClick={() => fileInputRef.current?.click()}>
              {loading ? 'Opening…' : 'Choose PDF'}
            </button>
          </div>

          <div className="privacy-row" aria-label="Privacy and platform features">
            <span><i />No file uploads</span>
            <span><i />Offline-ready</span>
            <span><i />Web, desktop & mobile</span>
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}
        </section>

        <section aria-labelledby="tools-title" className="tools-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Workspace</p>
              <h2 id="tools-title">Everything in one place.</h2>
            </div>
            <p>{UNIVERSAL_TOOLS.length} local-first tools in the production plan.</p>
          </div>

          <div className="tool-grid">
            {UNIVERSAL_TOOLS.map((tool) => (
              <button className="tool-card" key={tool.id} type="button" onClick={() => fileInputRef.current?.click()}>
                <span className="tool-icon"><ToolIcon id={tool.id} /></span>
                <span className="tool-card-copy">
                  <strong>{tool.name}</strong>
                  <span>{tool.description}</span>
                </span>
                <ArrowUpRightIcon className="tool-arrow" />
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <span>Giumag PDF</span>
        <span>Local-first document tools</span>
      </footer>
    </div>
  );
}
