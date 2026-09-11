import { useRef, useState } from 'react';
import { UNIVERSAL_TOOLS } from '@giumag/shared';
import type { LoadedPdf } from './lib/pdf';
import { loadPdfFile } from './lib/pdf';
import { useAutoAdvanceScroll } from './lib/use-auto-advance-scroll';
import { CompressPdfWorkspace } from './components/CompressPdfWorkspace';
import { ImagesToPdfWorkspace } from './components/ImagesToPdfWorkspace';
import { PdfToImagesWorkspace } from './components/PdfToImagesWorkspace';
import { PageNumbersWorkspace } from './components/PageNumbersWorkspace';
import { WatermarkWorkspace } from './components/WatermarkWorkspace';
import { MetadataWorkspace } from './components/MetadataWorkspace';
import { ProtectPdfWorkspace } from './components/ProtectPdfWorkspace';
import { UnlockPdfWorkspace } from './components/UnlockPdfWorkspace';
import { OcrPdfWorkspace } from './components/OcrPdfWorkspace';
import { FormsPdfWorkspace } from './components/FormsPdfWorkspace';
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
  | 'page-numbers'
  | 'watermark'
  | 'metadata'
  | 'protect'
  | 'unlock'
  | 'ocr'
  | 'forms'
  | null;

const AVAILABLE_TOOLS =
  UNIVERSAL_TOOLS.filter(
    (tool) =>
      tool.status === 'available',
  );

const PLANNED_TOOLS =
  UNIVERSAL_TOOLS.filter(
    (tool) =>
      tool.status === 'planned',
  );

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

  if (activeWorkspace === 'protect') {
    return (
      <ProtectPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'unlock') {
    return (
      <UnlockPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'ocr') {
    return (
      <OcrPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'forms') {
    return (
      <FormsPdfWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }
  if (activeWorkspace === 'metadata') {
    return (
      <MetadataWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'watermark') {
    return (
      <WatermarkWorkspace
        onClose={() => setActiveWorkspace(null)}
      />
    );
  }

  if (activeWorkspace === 'page-numbers') {
    return (
      <PageNumbersWorkspace
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
            Nessun upload dei tuoi PDF
          </div>

          <h1>
            Lavora con i PDF.
            <br />
            <span>Mantienili privati.</span>
          </h1>

          <p className="lede">
            Unisci, dividi, organizza, ritaglia e converti
            i PDF direttamente sul tuo dispositivo.
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
              <strong>
                {loading
                  ? 'Apertura documento...'
                  : 'Apri un PDF da organizzare'}
              </strong>

              <span>
                Trascinalo qui oppure sceglilo dal dispositivo
                per riordinare, ruotare, estrarre o rimuovere pagine.
              </span>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? 'Apertura...' : 'Apri PDF'}
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

        <section
          aria-labelledby="tools-title"
          className="tools-section"
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                Strumenti pronti
              </p>

              <h2 id="tools-title">
                Cosa vuoi fare?
              </h2>
            </div>

            <p>
              {AVAILABLE_TOOLS.length} strumenti già disponibili,
              tutti con elaborazione locale.
            </p>
          </div>

          <div className="tool-grid">
            {AVAILABLE_TOOLS.map((tool) => (
              <button
                className="tool-card"
                key={tool.id}
                type="button"
                onClick={() => {
                  switch (tool.id) {
                    case 'merge':
                      setActiveWorkspace('merge');
                      return;

                    case 'split':
                      setActiveWorkspace('split');
                      return;

                    case 'crop':
                      setActiveWorkspace('crop');
                      return;

                    case 'compress':
                      setActiveWorkspace('compress');
                      return;

                    case 'images-to-pdf':
                      setActiveWorkspace('images-to-pdf');
                      return;

                    case 'protect':
                      setActiveWorkspace('protect');
                      return;

                    case 'unlock':
                      setActiveWorkspace('unlock');
                      return;

                    case 'ocr':
                      setActiveWorkspace('ocr');
                      return;

                    case 'forms':
                      setActiveWorkspace('forms');
                      return;
                    case 'metadata':
                      setActiveWorkspace('metadata');
                      return;

                    case 'watermark':
                      setActiveWorkspace('watermark');
                      return;

                    case 'page-numbers':
                      setActiveWorkspace('page-numbers');
                      return;

                    case 'pdf-to-images':
                      setActiveWorkspace('pdf-to-images');
                      return;

                    case 'organize':
                      fileInputRef.current?.click();
                      return;

                    default:
                      return;
                  }
                }}
              >
                <span className="tool-icon">
                  <ToolIcon id={tool.id} />
                </span>

                <span className="tool-card-copy">
                  <strong>
                    {tool.name}
                  </strong>

                  <span>
                    {tool.description}
                  </span>
                </span>

                <ArrowUpRightIcon className="tool-arrow" />
              </button>
            ))}
          </div>

          <details className="home-planned-tools">
            <summary>
              <span>
                <strong>
                  Altri strumenti in arrivo
                </strong>

                <small>
                  {PLANNED_TOOLS.length} funzioni già previste
                  nella roadmap
                </small>
              </span>

              <span
                className="ux-advanced-chevron"
                aria-hidden="true"
              />
            </summary>

            <div className="tool-grid home-planned-grid">
              {PLANNED_TOOLS.map((tool) => (
                <article
                  className="tool-card tool-card-planned"
                  key={tool.id}
                  aria-label={`${tool.name}, in arrivo`}
                >
                  <span className="tool-icon">
                    <ToolIcon id={tool.id} />
                  </span>

                  <span className="tool-status-badge">
                    In arrivo
                  </span>

                  <span className="tool-card-copy">
                    <strong>
                      {tool.name}
                    </strong>

                    <span>
                      {tool.description}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </details>
        </section>
      </main>

      <footer className="home-footer">
        <span>Giumag PDF</span>
        <span>Strumenti PDF con elaborazione locale</span>
      </footer>
    </div>
  );
}