import { useRef, useState } from 'react';
import { UNIVERSAL_TOOLS } from '@giumag/shared';
import type { LoadedPdf } from './lib/pdf';
import { loadPdfFile } from './lib/pdf';
import { useAutoAdvanceScroll } from './lib/use-auto-advance-scroll';
import { PdfWorkspace } from './components/PdfWorkspace';
import {
  isWorkspaceToolId,
  ToolWorkspace,
  type WorkspaceToolId,
} from './tool-workspace-registry';
import { ArrowUpRightIcon, DocumentIcon, LockIcon, ShieldIcon, ToolIcon } from './components/Icons';

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
    useState<WorkspaceToolId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [toolQuery, setToolQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedToolQuery = toolQuery
    .trim()
    .toLocaleLowerCase('it');

  const filteredAvailableTools = normalizedToolQuery
    ? AVAILABLE_TOOLS.filter((tool) =>
        `${tool.name} ${tool.description}`
          .toLocaleLowerCase('it')
          .includes(normalizedToolQuery),
      )
    : AVAILABLE_TOOLS;

  function scrollToTools() {
    const toolsSection = document.getElementById('tools');

    if (!toolsSection) {
      return;
    }

    const reduceMotion = window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .matches;

    toolsSection.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

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

  if (activeWorkspace) {
    return (
      <ToolWorkspace
        toolId={activeWorkspace}
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
                  : 'Apri un PDF'}
              </strong>

              <span>
                Trascinalo qui oppure sceglilo dal dispositivo
                per visualizzare e organizzare le pagine. Per le altre
                operazioni, scegli uno strumento qui sotto.
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

          <div className="home-tools-jump">
            <button
              className="secondary-button"
              type="button"
              onClick={scrollToTools}
            >
              Vai agli strumenti
            </button>
          </div>

          <div className="privacy-row" aria-label="Privacy e funzionalità della piattaforma">
            <span><i />Nessun caricamento di file</span>
            <span><i />Disponibile anche offline</span>
            <span><i />Web, desktop e mobile</span>
          </div>

          <details className="home-privacy-details">
            <summary>
              Come funziona la privacy?
            </summary>

            <div className="home-privacy-details-content">
              <p>
                Per le operazioni supportate, i PDF vengono elaborati
                sul tuo dispositivo e non vengono inviati a un backend
                di elaborazione.
              </p>

              <p>
                Giumag PDF non usa analytics di default e la cache offline
                conserva gli asset dell'app, non i documenti.
              </p>

              <p>
                Quando carichi l'app, il provider di hosting può
                comunque vedere i normali metadati di rete, come l'indirizzo IP.
              </p>

              <a
                href="https://github.com/Giumag/giumag-pdf/blob/main/docs/SECURITY_PRIVACY.md"
                target="_blank"
                rel="noreferrer"
              >
                Approfondisci privacy e sicurezza
              </a>
            </div>
          </details>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
        </section>

        <section
          id="tools"
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

          <div className="tools-search">
            <label
              className="visually-hidden"
              htmlFor="tool-search"
            >
              Cerca uno strumento
            </label>

            <input
              id="tool-search"
              type="search"
              value={toolQuery}
              placeholder="Cerca uno strumento"
              autoComplete="off"
              onChange={(event) => setToolQuery(event.currentTarget.value)}
              aria-describedby="tool-search-status"
            />

            <span
              id="tool-search-status"
              className="tools-search-status"
              aria-live="polite"
            >
              {normalizedToolQuery
                ? `${filteredAvailableTools.length} ${
                    filteredAvailableTools.length === 1
                      ? 'strumento trovato'
                      : 'strumenti trovati'
                  }`
                : 'Cerca per nome o funzione'}
            </span>
          </div>

          {filteredAvailableTools.length > 0 ? (
            <div className="tool-grid">
            {filteredAvailableTools.map((tool) => (
              <button
                className="tool-card"
                key={tool.id}
                type="button"
                onClick={() => {
                  if (tool.id === 'organize') {
                    fileInputRef.current?.click();
                    return;
                  }

                  if (isWorkspaceToolId(tool.id)) {
                    setActiveWorkspace(tool.id);
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
          ) : (
            <div
              className="tools-empty"
              role="status"
            >
              <strong>Nessuno strumento trovato</strong>
              <span>Prova con un termine diverso.</span>
            </div>
          )}

          {PLANNED_TOOLS.length > 0 && (
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
          )}
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-brand">
          <strong>Giumag PDF</strong>
          <span>Beta pubblica · Elaborazione locale</span>
        </div>

        <nav
          className="home-footer-links"
          aria-label="Progetto e supporto"
        >
          <a
            href="https://github.com/Giumag/giumag-pdf"
            target="_blank"
            rel="noreferrer"
          >
            Codice sorgente
          </a>

          <a
            href="https://github.com/Giumag/giumag-pdf/issues"
            target="_blank"
            rel="noreferrer"
          >
            Segnala un problema
          </a>

          <a
            href="https://github.com/Giumag/giumag-pdf/blob/main/docs/SECURITY_PRIVACY.md"
            target="_blank"
            rel="noreferrer"
          >
            Privacy e sicurezza
          </a>
        </nav>
      </footer>
    </div>
  );
}