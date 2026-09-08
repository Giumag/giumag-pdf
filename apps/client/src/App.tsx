import { useRef, useState } from 'react';
import { UNIVERSAL_TOOLS } from '@giumag/shared';
import type { LoadedPdf } from './lib/pdf';
import { loadPdfFile } from './lib/pdf';
import { useAutoAdvanceScroll } from './lib/use-auto-advance-scroll';
import { CompressPdfWorkspace } from './components/CompressPdfWorkspace';
import { ImagesToPdfWorkspace } from './components/ImagesToPdfWorkspace';
import { PdfToImagesWorkspace } from './components/PdfToImagesWorkspace';
import { CropPdfWorkspace } from './components/CropPdfWorkspace';
import { MergePdfWorkspace } from './components/MergePdfWorkspace';
import { PdfWorkspace } from './components/PdfWorkspace';
import { SplitPdfWorkspace } from './components/SplitPdfWorkspace';
import { ArrowUpRightIcon, DocumentIcon, LockIcon, ShieldIcon, ToolIcon } from './components/Icons';

type ActiveWorkspace =
  | 'merge'
  | 'split'
  | 'crop'
  | 'compress'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | null;

export function App() {
  useAutoAdvanceScroll();

  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [activeWorkspace, setActiveWorkspace] =
    useState<ActiveWorkspace>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function openFile(file: File) {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadPdfFile(file);

      if (pdf) {
        await pdf.document.loadingTask.destroy();
      }

      setPdf(loaded);
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

  async function closeWorkspace() {
    if (pdf) {
      await pdf.document.loadingTask.destroy();
    }

    setPdf(null);
    setError(null);
  }

  if (pdf) {
    return (
      <PdfWorkspace
        pdf={pdf}
        onClose={() => void closeWorkspace()}
        onReplace={(file) => void openFile(file)}
      />
    );
  }

  if (activeWorkspace === 'merge') {
    return (
      <MergePdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'split') {
    return (
      <SplitPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }
  if (activeWorkspace === 'crop') {
    return (
      <CropPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'compress') {
    return (
      <CompressPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }
  if (activeWorkspace === 'images-to-pdf') {
    return (
      <ImagesToPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'pdf-to-images') {
    return (
      <PdfToImagesWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
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
          <span>Elaborazione sul dispositivo</span>
        </div>
      </header>

      <main className="home-content">
        <section className="hero">
          <div className="hero-label">
            <LockIcon className="inline-icon" />
            Privacy integrata nell'architettura
          </div>

          <h1>
            Lavora con i PDF.
            <br />
            <span>Mantienili privati.</span>
          </h1>

          <p className="lede">
            Uno spazio di lavoro PDF veloce per web, desktop e mobile. I tuoi documenti restano sul tuo dispositivo.
          </p>

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

          <div
            className={`dropzone${dragging ? ' dropzone-active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();

              if (event.currentTarget === event.target) {
                setDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);

              const file = event.dataTransfer.files?.[0];

              if (file) {
                void openFile(file);
              }
            }}
          >
            <div className="dropzone-icon" aria-hidden="true">
              <DocumentIcon />
            </div>

            <div className="dropzone-copy">
              <strong>{loading ? 'Apertura documento...' : 'Trascina qui un PDF'}</strong>
              <span>oppure scegli un documento da questo dispositivo</span>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? 'Apertura...' : 'Scegli PDF'}
            </button>
          </div>

          <div className="privacy-row" aria-label="Privacy e funzionalità della piattaforma">
            <span><i />Nessun caricamento di file</span>
            <span><i />Disponibile anche offline</span>
            <span><i />Web, desktop e mobile</span>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
        </section>

        <section aria-labelledby="tools-title" className="tools-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Area di lavoro</p>
              <h2 id="tools-title">Tutto in un unico posto.</h2>
            </div>

            <p>
              {UNIVERSAL_TOOLS.length} strumenti con elaborazione locale previsti nel piano di sviluppo.
            </p>
          </div>

          <div className="tool-grid">
            {UNIVERSAL_TOOLS.map((tool) => (
              <button
                className="tool-card"
                key={tool.id}
                type="button"
                onClick={() => {
                  if (tool.id === 'merge') {
                    setActiveWorkspace('merge');
                    return;
                  }

                  if (tool.id === 'split') {
                    setActiveWorkspace('split');
                    return;
                  }
                  if (tool.id === 'crop') {
                    setActiveWorkspace('crop');
                    return;
                  }

                  if (tool.id === 'compress') {
                    setActiveWorkspace('compress');
                    return;
                  }
                  if (tool.id === 'images-to-pdf') {
                    setActiveWorkspace('images-to-pdf');
                    return;
                  }

                  if (tool.id === 'pdf-to-images') {
                    setActiveWorkspace('pdf-to-images');
                    return;
                  }

                  fileInputRef.current?.click();
                }}
              >
                <span className="tool-icon">
                  <ToolIcon id={tool.id} />
                </span>

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
        <span>Strumenti PDF con elaborazione locale</span>
      </footer>
    </div>
  );
}