import { useRef, useState } from 'react';
import {
  UNIVERSAL_TOOLS,
  type ToolId,
} from '@giumag/shared';
import type { LoadedPdf } from './lib/pdf';
import { loadPdfFile } from './lib/pdf';
import { useAutoAdvanceScroll } from './lib/use-auto-advance-scroll';
import { PdfWorkspace } from './components/PdfWorkspace';
import {
  ShieldIcon,
  ToolIcon,
} from './components/Icons';
import {
  isWorkspaceToolId,
  ToolWorkspace,
  type WorkspaceToolId,
} from './tool-workspace-registry';

const AVAILABLE_TOOLS =
  UNIVERSAL_TOOLS.filter(
    (tool) => tool.status === 'available',
  );

const PLANNED_TOOLS =
  UNIVERSAL_TOOLS.filter(
    (tool) => tool.status === 'planned',
  );

const QUICK_TOOL_IDS: readonly ToolId[] = [
  'organize',
  'merge',
  'compress',
  'split',
  'images-to-pdf',
  'pdf-to-images',
];

interface HomeToolGroup {
  label: string;
  ids: readonly ToolId[];
}

const HOME_TOOL_GROUPS: readonly HomeToolGroup[] = [
  {
    label: 'Organizza',
    ids: [
      'merge',
      'split',
      'organize',
      'crop',
      'compress',
    ],
  },
  {
    label: 'Converti',
    ids: [
      'images-to-pdf',
      'pdf-to-images',
      'ocr',
    ],
  },
  {
    label: 'Modifica',
    ids: [
      'watermark',
      'page-numbers',
      'forms',
      'sign-visual',
      'redact',
    ],
  },
  {
    label: 'Proteggi',
    ids: [
      'protect',
      'unlock',
      'metadata',
    ],
  },
  {
    label: 'Altro',
    ids: [
      'compare',
      'repair',
    ],
  },
];

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function App() {
  useAutoAdvanceScroll();

  const [pdf, setPdf] =
    useState<LoadedPdf | null>(null);

  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceToolId | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [toolQuery, setToolQuery] =
    useState('');

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const normalizedToolQuery = toolQuery
    .trim()
    .toLocaleLowerCase('it');

  const filteredAvailableTools =
    normalizedToolQuery
      ? AVAILABLE_TOOLS.filter((tool) =>
          `${tool.name} ${tool.description}`
            .toLocaleLowerCase('it')
            .includes(normalizedToolQuery),
        )
      : AVAILABLE_TOOLS;

  const quickTools =
    QUICK_TOOL_IDS.flatMap((id) => {
      const tool =
        AVAILABLE_TOOLS.find(
          (candidate) =>
            candidate.id === id,
        );

      return tool ? [tool] : [];
    });

  const groupedAvailableTools =
    HOME_TOOL_GROUPS
      .map((group) => ({
        ...group,
        tools:
          filteredAvailableTools.filter(
            (tool) =>
              group.ids.includes(tool.id),
          ),
      }))
      .filter(
        (group) =>
          group.tools.length > 0,
      );

  async function openFile(file: File) {
    setLoading(true);
    setError(null);

    try {
      const loaded =
        await loadPdfFile(file);

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

  function openTool(toolId: ToolId) {
    if (toolId === 'organize') {
      fileInputRef.current?.click();
      return;
    }

    if (isWorkspaceToolId(toolId)) {
      setActiveWorkspace(toolId);
    }
  }

  if (pdf) {
    return (
      <PdfWorkspace
        pdf={pdf}
        onClose={() =>
          void closeWorkspace()
        }
        onReplace={(file) =>
          void openFile(file)
        }
      />
    );
  }

  if (activeWorkspace) {
    return (
      <ToolWorkspace
        toolId={activeWorkspace}
        onClose={() =>
          setActiveWorkspace(null)
        }
      />
    );
  }

  return (
    <div className="home-page soft-home">
      <header className="soft-home-header">
        <div
          className="soft-brand"
          aria-label="Giumag PDF"
        >
          <span className="soft-brand-mark">
            G
          </span>

          <span>Giumag PDF</span>
        </div>

        <div className="soft-header-actions">
          <div className="soft-local-status">
            <span
              className="soft-local-dot"
              aria-hidden="true"
            />
            <span>
              Elaborazione locale
            </span>
          </div>

          <a
            className="soft-github-link"
            href="https://github.com/Giumag/giumag-pdf"
            target="_blank"
            rel="noreferrer"
            aria-label="Apri Giumag PDF su GitHub"
            title="GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.455-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.071 1.532 1.031 1.532 1.031.892 1.53 2.341 1.088 2.91.832.091-.647.349-1.088.635-1.338-2.221-.253-4.555-1.112-4.555-4.945 0-1.092.39-1.985 1.029-2.684-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.378.203 2.397.1 2.65.64.699 1.028 1.592 1.028 2.684 0 3.842-2.337 4.688-4.566 4.936.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.481C19.138 20.194 22 16.442 22 12.017 22 6.484 17.523 2 12 2Z"
              />
            </svg>
          </a>
        </div>
      </header>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          const file =
            event.currentTarget.files?.[0];

          if (file) {
            void openFile(file);
          }

          event.currentTarget.value = '';
        }}
      />

      <main className="soft-home-main">
        <section className="soft-hero">
          <div className="soft-hero-copy">
            <h1>
              Lavora con i PDF.
              <span>
                Mantienili privati.
              </span>
            </h1>

            <p>
              Scegli cosa vuoi fare e apri il documento
              direttamente nello strumento giusto.
              Le operazioni supportate restano sul tuo dispositivo.
            </p>
          </div>

          <div className="soft-hero-local">
            <span
              className="soft-local-dot"
              aria-hidden="true"
            />

            <span>
              I documenti non vengono inviati
              a un server di elaborazione.
            </span>
          </div>
        </section>

        {error && (
          <div
            className="soft-error"
            role="alert"
          >
            <span
              className="soft-error-dot"
              aria-hidden="true"
            />

            <span>{error}</span>
          </div>
        )}
        <section
          className="soft-quick"
          aria-labelledby="quick-tools-title"
        >
          <div className="soft-section-heading">
            <div>
              <h2 id="quick-tools-title">
                Cosa vuoi fare?
              </h2>

              <p>
                Scegli uno strumento per iniziare.
              </p>
            </div>
          </div>

          <div className="soft-quick-grid">
            {quickTools.map((tool) => (
              <button
                className="soft-quick-tile"
                key={tool.id}
                type="button"
                onClick={() =>
                  openTool(tool.id)
                }
              >
                <span className="soft-quick-icon">
                  <ToolIcon id={tool.id} />
                </span>

                <span className="soft-quick-copy">
                  <strong>
                    {tool.name}
                  </strong>

                  <span>
                    {tool.description}
                  </span>
                </span>

                <span className="soft-tile-chevron">
                  <ChevronIcon />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          id="tools"
          className="soft-tools"
          aria-labelledby="tools-title"
        >
          <div className="soft-tools-top">
            <div className="soft-section-heading">
              <div>
                <h2 id="tools-title">
                  Tutti gli strumenti
                </h2>

                <p>
                  Scegli cosa vuoi fare
                  con il tuo documento.
                </p>
              </div>
            </div>

            <div className="soft-search">
              <SearchIcon />

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
                onChange={(event) =>
                  setToolQuery(
                    event.currentTarget.value,
                  )
                }
                aria-describedby={
                  normalizedToolQuery
                    ? 'tool-search-status'
                    : undefined
                }
              />

              {normalizedToolQuery && (
                <span
                  id="tool-search-status"
                  className="soft-search-count"
                  aria-live="polite"
                >
                  {filteredAvailableTools.length}
                </span>
              )}
            </div>
          </div>

          {filteredAvailableTools.length > 0 ? (
            <div className="soft-tool-groups">
              {groupedAvailableTools.map(
                (group) => (
                  <section
                    className="soft-tool-group"
                    key={group.label}
                    aria-labelledby={`soft-group-${group.label}`}
                  >
                    <h3
                      id={`soft-group-${group.label}`}
                    >
                      {group.label}
                    </h3>

                    <div className="soft-tool-grid">
                      {group.tools.map(
                        (tool) => (
                          <button
                            className="soft-tool-tile"
                            key={tool.id}
                            type="button"
                            onClick={() =>
                              openTool(tool.id)
                            }
                          >
                            <span className="soft-tool-icon">
                              <ToolIcon
                                id={tool.id}
                              />
                            </span>

                            <span className="soft-tool-copy">
                              <strong>
                                {tool.name}
                              </strong>

                              <span>
                                {tool.description}
                              </span>
                            </span>

                            <span className="soft-tool-chevron">
                              <ChevronIcon />
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </section>
                ),
              )}
            </div>
          ) : (
            <div
              className="soft-tools-empty"
              role="status"
            >
              <strong>
                Nessuno strumento trovato
              </strong>

              <span>
                Prova con un termine diverso.
              </span>
            </div>
          )}

          {PLANNED_TOOLS.length > 0 && (
            <details className="soft-planned">
              <summary>
                Altri strumenti in arrivo
              </summary>

              <div className="soft-planned-grid">
                {PLANNED_TOOLS.map(
                  (tool) => (
                    <article key={tool.id}>
                      <strong>
                        {tool.name}
                      </strong>

                      <span>
                        {tool.description}
                      </span>
                    </article>
                  ),
                )}
              </div>
            </details>
          )}
        </section>

        <section
          className="soft-privacy"
          aria-labelledby="privacy-title"
        >
          <div className="soft-privacy-icon">
            <ShieldIcon />
          </div>

          <div className="soft-privacy-copy">
            <h2 id="privacy-title">
              I tuoi PDF restano
              sul tuo dispositivo.
            </h2>

            <p>
              Le operazioni supportate vengono
              eseguite localmente senza inviare
              i documenti a un server di
              elaborazione.
            </p>

            <p className="soft-privacy-note">
              Quando carichi l'app, il provider
              di hosting può comunque ricevere
              i normali metadati di rete.
            </p>
          </div>

          <a
            className="soft-privacy-link"
            href="https://github.com/Giumag/giumag-pdf/blob/main/docs/SECURITY_PRIVACY.md"
            target="_blank"
            rel="noreferrer"
          >
            Come funziona
            <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer className="soft-footer">
        <div>
          <strong>Giumag PDF</strong>
          <span>Beta pubblica</span>
        </div>

        <nav aria-label="Progetto e supporto">
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
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  );
}