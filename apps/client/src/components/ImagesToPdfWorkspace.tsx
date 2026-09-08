import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  ImagesPdfFit,
  ImagesPdfOrientation,
  ImagesPdfPageSize,
  PageRotation,
} from '@giumag/pdf-engine';

import {
  acceptsImageFile,
  disposePreparedImage,
  prepareImageFile,
  type PreparedPdfImage,
} from '../lib/image-input';

import {
  ImagesToPdfWorkerClient,
} from '../lib/images-to-pdf-worker';

import {
  formatBytes,
} from '../lib/pdf';

import {
  DocumentIcon,
  DownloadIcon,
  ShieldIcon,
  ToolIcon,
} from './Icons';

interface ImagesToPdfWorkspaceProps {
  onClose: () => void;
}

interface GeneratedPdf {
  bytes: Uint8Array;
  size: number;
}

function RotateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M4.5 8.2A8 8 0 1 1 4 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 3.8v4.7h4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M7.5 8.5v9.2c0 1 .8 1.8 1.8 1.8h5.4c1 0 1.8-.8 1.8-1.8V8.5M5.5 6h13M9.5 6V4.5h5V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="8" cy="7" r="1.2" fill="currentColor" />
      <circle cx="16" cy="7" r="1.2" fill="currentColor" />
      <circle cx="8" cy="12" r="1.2" fill="currentColor" />
      <circle cx="16" cy="12" r="1.2" fill="currentColor" />
      <circle cx="8" cy="17" r="1.2" fill="currentColor" />
      <circle cx="16" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ArrowIcon({
  direction,
}: {
  direction: 'left' | 'right';
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={
        direction === 'right'
          ? 'is-right'
          : undefined
      }
    >
      <path
        d="m14.5 6-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function nextRotation(
  rotation: PageRotation,
): PageRotation {
  if (rotation === 0) {
    return 90;
  }

  if (rotation === 90) {
    return 180;
  }

  if (rotation === 180) {
    return 270;
  }

  return 0;
}

function dataTransferHasFiles(
  dataTransfer: DataTransfer,
) {
  return Array.from(
    dataTransfer.types,
  ).includes('Files');
}

function downloadPdf(
  bytes: Uint8Array,
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
  anchor.download =
    'giumag-immagini.pdf';

  anchor.style.display = 'none';

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1500,
  );
}

export function ImagesToPdfWorkspace({
  onClose,
}: ImagesToPdfWorkspaceProps) {
  const [
    images,
    setImages,
  ] = useState<
    PreparedPdfImage[]
  >([]);

  const [
    pageSize,
    setPageSize,
  ] = useState<
    ImagesPdfPageSize
  >('a4');

  const [
    orientation,
    setOrientation,
  ] = useState<
    ImagesPdfOrientation
  >('auto');

  const [
    fit,
    setFit,
  ] = useState<
    ImagesPdfFit
  >('contain');

  const [
    margin,
    setMargin,
  ] = useState(24);

  const [
    importing,
    setImporting,
  ] = useState(false);

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    externalDragging,
    setExternalDragging,
  ] = useState(false);

  const [
    draggingId,
    setDraggingId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    result,
    setResult,
  ] = useState<
    GeneratedPdf | null
  >(null);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const imagesRef =
    useRef(images);

  const workerRef =
    useRef<
      ImagesToPdfWorkerClient | null
    >(null);

  useEffect(() => {
    imagesRef.current =
      images;
  }, [images]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();

      for (
        const image
        of imagesRef.current
      ) {
        disposePreparedImage(
          image,
        );
      }
    };
  }, []);

  function invalidateResult() {
    setResult(null);
    setError(null);
  }

  function getWorker() {
    if (!workerRef.current) {
      workerRef.current =
        new ImagesToPdfWorkerClient();
    }

    return workerRef.current;
  }

  async function addFiles(
    files: File[],
  ) {
    const accepted =
      files.filter(
        acceptsImageFile,
      );

    if (accepted.length === 0) {
      setError(
        'Aggiungi immagini JPEG, PNG o WebP.',
      );

      return;
    }

    setImporting(true);
    setError(null);

    const prepared:
      PreparedPdfImage[] = [];

    const failures:
      string[] = [];

    try {
      for (
        const file
        of accepted
      ) {
        try {
          prepared.push(
            await prepareImageFile(
              file,
            ),
          );
        } catch (caught) {
          failures.push(
            caught instanceof Error
              ? caught.message
              : file.name,
          );
        }
      }

      if (
        prepared.length > 0
      ) {
        setImages(
          (current) => [
            ...current,
            ...prepared,
          ],
        );

        invalidateResult();
      }

      if (
        failures.length > 0
      ) {
        setError(
          `Alcune immagini non sono state importate: ${failures.join(' · ')}`,
        );
      }
    } finally {
      setImporting(false);
    }
  }

  function removeImage(
    id: string,
  ) {
    setImages((current) => {
      const target =
        current.find(
          (image) =>
            image.id === id,
        );

      if (target) {
        disposePreparedImage(
          target,
        );
      }

      return current.filter(
        (image) =>
          image.id !== id,
      );
    });

    invalidateResult();
  }

  function rotateImage(
    id: string,
  ) {
    setImages((current) =>
      current.map(
        (image) =>
          image.id === id
            ? {
                ...image,
                rotation:
                  nextRotation(
                    image.rotation,
                  ),
              }
            : image,
      ),
    );

    invalidateResult();
  }

  function moveImage(
    id: string,
    targetIndex: number,
  ) {
    setImages((current) => {
      const sourceIndex =
        current.findIndex(
          (image) =>
            image.id === id,
        );

      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >=
          current.length ||
        sourceIndex ===
          targetIndex
      ) {
        return current;
      }

      const next =
        [...current];

      const [item] =
        next.splice(
          sourceIndex,
          1,
        );

      next.splice(
        targetIndex,
        0,
        item,
      );

      return next;
    });

    invalidateResult();
  }

  function dropImageBefore(
    sourceId: string,
    targetId: string,
  ) {
    setImages((current) => {
      const sourceIndex =
        current.findIndex(
          (image) =>
            image.id ===
            sourceId,
        );

      const targetIndex =
        current.findIndex(
          (image) =>
            image.id ===
            targetId,
        );

      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex ===
          targetIndex
      ) {
        return current;
      }

      const next =
        [...current];

      const [item] =
        next.splice(
          sourceIndex,
          1,
        );

      const adjustedTarget =
        sourceIndex <
        targetIndex
          ? targetIndex - 1
          : targetIndex;

      next.splice(
        adjustedTarget,
        0,
        item,
      );

      return next;
    });

    invalidateResult();
  }

  async function generatePdf() {
    if (
      images.length === 0
    ) {
      setError(
        'Aggiungi almeno un’immagine.',
      );

      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const bytes =
        await getWorker().generate(
          images.map(
            (image) => ({
              bytes:
                image.bytes,
              format:
                image.format,
              rotation:
                image.rotation,
            }),
          ),
          {
            pageSize,
            orientation,
            fit,
            margin,
          },
        );

      setResult({
        bytes,
        size:
          bytes.byteLength,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile creare il PDF.',
      );
    } finally {
      setGenerating(false);
    }
  }

  const busy =
    importing ||
    generating;

  return (
    <main className="workspace-shell images-pdf-shell">
      <header className="workspace-topbar glass-surface">
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

        <div className="document-title">
          <strong>
            Immagini in PDF
          </strong>

          <span>
            <ShieldIcon />

            {images.length > 0
              ? `${images.length} ${
                  images.length === 1
                    ? 'immagine'
                    : 'immagini'
                } · locale`
              : 'Area di lavoro locale'}
          </span>
        </div>

        <div className="topbar-actions">
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const files =
                Array.from(
                  event.currentTarget.files ??
                    [],
                );

              if (
                files.length > 0
              ) {
                void addFiles(
                  files,
                );
              }

              event.currentTarget.value =
                '';
            }}
          />

          <button
            className="secondary-button compact-button"
            type="button"
            disabled={busy}
            onClick={() =>
              inputRef.current?.click()
            }
          >
            <span>
              + Aggiungi
            </span>
          </button>

          <button
            className="primary-button compact-button"
            type="button"
            disabled={
              busy ||
              images.length === 0
            }
            onClick={() =>
              void generatePdf()
            }
          >
            <ToolIcon id="images-to-pdf" />

            <span>
              {generating
                ? 'Creazione...'
                : 'Crea PDF'}
            </span>
          </button>
        </div>
      </header>

      <div
        className={[
          'images-pdf-workspace',
          externalDragging
            ? 'is-dragging-files'
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
          setExternalDragging(true);
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

          setExternalDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            setExternalDragging(
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

          setExternalDragging(
            false,
          );

          void addFiles(
            Array.from(
              event.dataTransfer.files,
            ),
          );
        }}
      >
        <div className="images-pdf-content">
          <section className="images-pdf-heading">
            <div>
              <p className="images-pdf-kicker">
                Immagini in PDF
              </p>

              <h1>
                Da immagini a documento,
                tutto qui.
              </h1>
            </div>

            <p>
              Ordina, ruota e impagina
              JPEG, PNG e WebP.
              Il documento viene creato
              interamente sul dispositivo.
            </p>
          </section>

          {images.length === 0 ? (
            <section
              className={[
                'images-pdf-empty',
                externalDragging
                  ? 'is-active'
                  : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="images-pdf-empty-icon">
                <DocumentIcon />
              </div>

              <strong>
                {importing
                  ? 'Importazione immagini...'
                  : 'Trascina qui le immagini'}
              </strong>

              <span>
                JPEG, PNG e WebP · puoi
                selezionare più file insieme.
              </span>

              <button
                className="primary-button"
                type="button"
                disabled={importing}
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                Scegli immagini
              </button>
            </section>
          ) : (
            <div className="images-pdf-layout">
              <section className="images-pdf-gallery-panel">
                <div className="images-pdf-section-header">
                  <div>
                    <p className="images-pdf-kicker">
                      Pagine
                    </p>

                    <h2>
                      Ordina le immagini
                    </h2>
                  </div>

                  <span>
                    Trascina per riordinare
                  </span>
                </div>

                <div className="images-pdf-grid">
                  {images.map(
                    (
                      image,
                      index,
                    ) => (
                      <article
                        key={image.id}
                        className={[
                          'images-pdf-card',
                          draggingId ===
                          image.id
                            ? 'is-dragging'
                            : '',
                        ].filter(Boolean).join(' ')}
                        draggable={!busy}
                        onDragStart={(event) => {
                          if (busy) {
                            event.preventDefault();
                            return;
                          }

                          setDraggingId(
                            image.id,
                          );

                          event.dataTransfer.effectAllowed =
                            'move';

                          event.dataTransfer.setData(
                            'text/plain',
                            image.id,
                          );
                        }}
                        onDragEnd={() =>
                          setDraggingId(
                            null,
                          )
                        }
                        onDragOver={(event) => {
                          if (
                            dataTransferHasFiles(
                              event.dataTransfer,
                            )
                          ) {
                            return;
                          }

                          event.preventDefault();
                          event.dataTransfer.dropEffect =
                            'move';
                        }}
                        onDrop={(event) => {
                          if (
                            dataTransferHasFiles(
                              event.dataTransfer,
                            )
                          ) {
                            return;
                          }

                          event.preventDefault();

                          const sourceId =
                            event.dataTransfer.getData(
                              'text/plain',
                            ) ||
                            draggingId;

                          if (sourceId) {
                            dropImageBefore(
                              sourceId,
                              image.id,
                            );
                          }

                          setDraggingId(
                            null,
                          );
                        }}
                      >
                        <div className="images-pdf-card-topline">
                          <span className="images-pdf-page-number">
                            {index + 1}
                          </span>

                          <span
                            className="images-pdf-grip"
                            aria-hidden="true"
                          >
                            <GripIcon />
                          </span>
                        </div>

                        <div className="images-pdf-preview">
                          <img
                            src={image.previewUrl}
                            alt=""
                            draggable={false}
                            style={{
                              transform:
                                `rotate(${image.rotation}deg)`,
                            }}
                          />
                        </div>

                        <div className="images-pdf-card-copy">
                          <strong
                            title={image.name}
                          >
                            {image.name}
                          </strong>

                          <span>
                            {image.width}
                            ×
                            {image.height}
                            {' · '}
                            {formatBytes(
                              image.originalSize,
                            )}
                          </span>
                        </div>

                        <div className="images-pdf-card-actions">
                          <button
                            type="button"
                            title="Sposta indietro"
                            aria-label="Sposta indietro"
                            disabled={
                              busy ||
                              index === 0
                            }
                            onClick={() =>
                              moveImage(
                                image.id,
                                index - 1,
                              )
                            }
                          >
                            <ArrowIcon direction="left" />
                          </button>

                          <button
                            type="button"
                            title="Sposta avanti"
                            aria-label="Sposta avanti"
                            disabled={
                              busy ||
                              index ===
                                images.length - 1
                            }
                            onClick={() =>
                              moveImage(
                                image.id,
                                index + 1,
                              )
                            }
                          >
                            <ArrowIcon direction="right" />
                          </button>

                          <button
                            type="button"
                            title="Ruota"
                            aria-label="Ruota immagine"
                            disabled={busy}
                            onClick={() =>
                              rotateImage(
                                image.id,
                              )
                            }
                          >
                            <RotateIcon />
                          </button>

                          <button
                            className="is-danger"
                            type="button"
                            title="Rimuovi"
                            aria-label="Rimuovi immagine"
                            disabled={busy}
                            onClick={() =>
                              removeImage(
                                image.id,
                              )
                            }
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>

                <button
                  className="images-pdf-add-more"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    inputRef.current?.click()
                  }
                >
                  + Aggiungi altre immagini
                </button>
              </section>

              <aside className="images-pdf-settings">
                <div className="images-pdf-section-header">
                  <div>
                    <p className="images-pdf-kicker">
                      Documento
                    </p>

                    <h2>
                      Impaginazione
                    </h2>
                  </div>
                </div>

                <label className="images-pdf-field">
                  <span>
                    Formato pagina
                  </span>

                  <select
                    value={pageSize}
                    disabled={busy}
                    onChange={(event) => {
                      setPageSize(
                        event.target.value as ImagesPdfPageSize
                      );

                      invalidateResult();
                    }}
                  >
                    <option value="a4">
                      A4
                    </option>

                    <option value="letter">
                      Letter
                    </option>

                    <option value="auto">
                      Automatico
                    </option>
                  </select>
                </label>

                <label className="images-pdf-field">
                  <span>
                    Orientamento
                  </span>

                  <select
                    value={orientation}
                    disabled={busy}
                    onChange={(event) => {
                      setOrientation(
                        event.target.value as ImagesPdfOrientation
                      );

                      invalidateResult();
                    }}
                  >
                    <option value="auto">
                      Automatico
                    </option>

                    <option value="portrait">
                      Verticale
                    </option>

                    <option value="landscape">
                      Orizzontale
                    </option>
                  </select>
                </label>

                <div className="images-pdf-field">
                  <span>
                    Adattamento
                  </span>

                  <div className="images-pdf-segmented">
                    <button
                      type="button"
                      className={
                        fit === 'contain'
                          ? 'is-active'
                          : undefined
                      }
                      disabled={busy}
                      onClick={() => {
                        setFit('contain');
                        invalidateResult();
                      }}
                    >
                      Adatta
                    </button>

                    <button
                      type="button"
                      className={
                        fit === 'cover'
                          ? 'is-active'
                          : undefined
                      }
                      disabled={busy}
                      onClick={() => {
                        setFit('cover');
                        invalidateResult();
                      }}
                    >
                      Riempi
                    </button>
                  </div>
                </div>

                <label className="images-pdf-field">
                  <span className="images-pdf-field-line">
                    <span>
                      Margini
                    </span>

                    <strong>
                      {margin === 0
                        ? 'Nessuno'
                        : `${margin} pt`}
                    </strong>
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="6"
                    value={margin}
                    disabled={
                      busy ||
                      fit === 'cover'
                    }
                    onChange={(event) => {
                      setMargin(
                        Number(
                          event.target.value,
                        ),
                      );

                      invalidateResult();
                    }}
                  />
                </label>

                {fit === 'cover' && (
                  <p className="images-pdf-setting-note">
                    Con “Riempi” l’immagine
                    raggiunge i bordi della pagina
                    e i margini vengono ignorati.
                  </p>
                )}

                <div className="images-pdf-summary">
                  <span>
                    Documento
                  </span>

                  <strong>
                    {images.length}
                    {' '}
                    {images.length === 1
                      ? 'pagina'
                      : 'pagine'}
                  </strong>

                  <small>
                    {pageSize === 'a4'
                      ? 'A4'
                      : pageSize === 'letter'
                        ? 'Letter'
                        : 'Formato automatico'}
                    {' · '}
                    {fit === 'contain'
                      ? 'Adatta'
                      : 'Riempi'}
                  </small>
                </div>

                <button
                  className="primary-button images-pdf-generate"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void generatePdf()
                  }
                >
                  <ToolIcon id="images-to-pdf" />

                  <span>
                    {generating
                      ? 'Creazione PDF...'
                      : 'Crea PDF'}
                  </span>
                </button>
              </aside>
            </div>
          )}

          {error && (
            <div
              className="images-pdf-message is-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {result && (
            <section className="images-pdf-result">
              <div>
                <p className="images-pdf-kicker">
                  Completato
                </p>

                <h2>
                  Il PDF è pronto.
                </h2>

                <span>
                  {images.length}
                  {' '}
                  {images.length === 1
                    ? 'pagina'
                    : 'pagine'}
                  {' · '}
                  {formatBytes(
                    result.size,
                  )}
                </span>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  downloadPdf(
                    result.bytes,
                  )
                }
              >
                <DownloadIcon />

                <span>
                  Scarica PDF
                </span>
              </button>
            </section>
          )}

          <div className="images-pdf-privacy">
            <ShieldIcon />

            <span>
              Nessun upload. Immagini, anteprime
              e PDF finale restano sul dispositivo.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}