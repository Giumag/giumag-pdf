import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  buildVisualSignaturePdf,
  type VisualSignatureMimeType,
  type VisualSignaturePlacement,
} from '../lib/visual-signature';

import {
  VisualSignatureCanvas,
} from './VisualSignatureCanvas';

interface VisualSignatureWorkspaceProps {
  onClose: () => void;
}

interface SignatureAsset {
  bytes: Uint8Array;
  mimeType: VisualSignatureMimeType;
  previewUrl: string;
  aspectRatio: number;
  name: string;
}

function dataUrlToBytes(
  dataUrl: string,
): Uint8Array {
  const commaIndex =
    dataUrl.indexOf(',');

  if (commaIndex < 0) {
    throw new Error(
      'Firma disegnata non valida.',
    );
  }

  const binary = atob(
    dataUrl.slice(
      commaIndex + 1,
    ),
  );

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index++
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
}

async function loadImageSize(
  url: string,
): Promise<{
  width: number;
  height: number;
}> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          width:
            image.naturalWidth,
          height:
            image.naturalHeight,
        });
      };

      image.onerror = () => {
        reject(
          new Error(
            'Impossibile leggere l’immagine della firma.',
          ),
        );
      };

      image.src = url;
    },
  );
}

function outputFileName(
  originalName: string,
): string {
  const base =
    originalName.replace(
      /\.pdf$/i,
      '',
    );

  return `${base}-firmato.pdf`;
}

function SignaturePad({
  onUse,
}: {
  onUse: (
    dataUrl: string,
    aspectRatio: number,
  ) => void;
}) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const drawingRef =
    useRef(false);

  const [hasInk, setHasInk] =
    useState(false);

  const clear = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    setHasInk(false);
  };

  const point = (
    event: ReactPointerEvent<
      HTMLCanvasElement
    >,
  ) => {
    const canvas =
      event.currentTarget;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        (
          event.clientX -
          rect.left
        ) *
        (
          canvas.width /
          rect.width
        ),
      y:
        (
          event.clientY -
          rect.top
        ) *
        (
          canvas.height /
          rect.height
        ),
    };
  };

  const start = (
    event: ReactPointerEvent<
      HTMLCanvasElement
    >,
  ) => {
    const context =
      event.currentTarget
        .getContext('2d');

    if (!context) {
      return;
    }

    event.preventDefault();

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );

    drawingRef.current = true;

    const current =
      point(event);

    context.beginPath();
    context.moveTo(
      current.x,
      current.y,
    );

    context.strokeStyle =
      '#111827';

    context.lineWidth = 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    setHasInk(true);
  };

  const move = (
    event: ReactPointerEvent<
      HTMLCanvasElement
    >,
  ) => {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();

    const context =
      event.currentTarget
        .getContext('2d');

    if (!context) {
      return;
    }

    const current =
      point(event);

    context.lineTo(
      current.x,
      current.y,
    );

    context.stroke();
  };

  const finish = () => {
    drawingRef.current = false;
  };

  const useDrawing = () => {
    const canvas =
      canvasRef.current;

    if (
      !canvas ||
      !hasInk
    ) {
      return;
    }

    onUse(
      canvas.toDataURL(
        'image/png',
      ),
      canvas.width /
        canvas.height,
    );
  };

  return (
    <div className="visual-signature-pad-card">
      <div className="visual-signature-pad-wrap">
        <canvas
          ref={canvasRef}
          width={720}
          height={240}
          className="visual-signature-pad"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>

      <div className="visual-signature-pad-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={clear}
        >
          Pulisci
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={!hasInk}
          onClick={useDrawing}
        >
          Usa questa firma
        </button>
      </div>
    </div>
  );
}

export function VisualSignatureWorkspace({
  onClose,
}: VisualSignatureWorkspaceProps) {
  const pdfInputRef =
    useRef<HTMLInputElement>(null);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] =
    useState<File | null>(null);

  const [pdfBytes, setPdfBytes] =
    useState<Uint8Array | null>(
      null,
    );

  const [signature, setSignature] =
    useState<SignatureAsset | null>(
      null,
    );

  const [mode, setMode] =
    useState<
      'draw' | 'import'
    >('draw');

  const [pageIndex, setPageIndex] =
    useState(0);

  const [pageCount, setPageCount] =
    useState(1);

  const [placements, setPlacements] =
    useState<
      Record<
        number,
        VisualSignaturePlacement
      >
    >({});

  const [exporting, setExporting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (
        signature
          ?.previewUrl
          .startsWith('blob:')
      ) {
        URL.revokeObjectURL(
          signature.previewUrl,
        );
      }
    };
  }, [signature]);

  const signedPageCount =
    useMemo(
      () =>
        Object.keys(
          placements,
        ).length,
      [placements],
    );

  const setSignatureAsset = (
    asset: SignatureAsset,
  ) => {
    setSignature(asset);
    setPlacements({});
    setError(null);
  };

  const choosePdf = async (
    file: File,
  ) => {
    if (
      file.type !==
        'application/pdf' &&
      !file.name
        .toLowerCase()
        .endsWith('.pdf')
    ) {
      setError(
        'Seleziona un file PDF.',
      );
      return;
    }

    setError(null);

    const bytes =
      new Uint8Array(
        await file.arrayBuffer(),
      );

    setPdfFile(file);
    setPdfBytes(bytes);
    setPageIndex(0);
    setPageCount(1);
    setPlacements({});
  };

  const importSignature = async (
    file: File,
  ) => {
    const mimeType:
      | VisualSignatureMimeType
      | null =
      file.type === 'image/png'
        ? 'image/png'
        : file.type ===
            'image/jpeg'
          ? 'image/jpeg'
          : null;

    if (!mimeType) {
      setError(
        'La firma deve essere PNG oppure JPG/JPEG.',
      );
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    try {
      const size =
        await loadImageSize(
          previewUrl,
        );

      const bytes =
        new Uint8Array(
          await file.arrayBuffer(),
        );

      setSignatureAsset({
        bytes,
        mimeType,
        previewUrl,
        aspectRatio:
          size.width /
          size.height,
        name: file.name,
      });
    } catch (importError) {
      URL.revokeObjectURL(
        previewUrl,
      );

      setError(
        importError instanceof Error
          ? importError.message
          : String(importError),
      );
    }
  };

  const useDrawing = (
    dataUrl: string,
    aspectRatio: number,
  ) => {
    setSignatureAsset({
      bytes:
        dataUrlToBytes(
          dataUrl,
        ),
      mimeType: 'image/png',
      previewUrl: dataUrl,
      aspectRatio,
      name: 'Firma disegnata',
    });
  };

  const updateCurrentPlacement = (
    next:
      | VisualSignaturePlacement
      | null,
  ) => {
    setPlacements(
      (current) => {
        const copy = {
          ...current,
        };

        if (!next) {
          delete copy[pageIndex];

          return copy;
        }

        copy[pageIndex] = {
          ...next,
          pageIndex,
        };

        return copy;
      },
    );
  };

  const previousPage = () => {
    setPageIndex(
      (current) =>
        Math.max(
          0,
          current - 1,
        ),
    );
  };

  const nextPage = () => {
    setPageIndex(
      (current) =>
        Math.min(
          pageCount - 1,
          current + 1,
        ),
    );
  };

  const exportPdf = async () => {
    if (
      !pdfBytes ||
      !pdfFile ||
      !signature
    ) {
      return;
    }

    const orderedPlacements =
      Object.values(
        placements,
      ).sort(
        (left, right) =>
          left.pageIndex -
          right.pageIndex,
      );

    if (
      orderedPlacements.length === 0
    ) {
      setError(
        'Posiziona la firma su almeno una pagina.',
      );

      return;
    }

    setExporting(true);
    setError(null);

    try {
      const bytes =
        await buildVisualSignaturePdf(
          pdfBytes,
          signature.bytes,
          signature.mimeType,
          orderedPlacements,
        );
      const pdfBuffer =
        new ArrayBuffer(
          bytes.byteLength,
        );

      new Uint8Array(
        pdfBuffer,
      ).set(bytes);

      const blob =
        new Blob(
          [pdfBuffer],
          {
            type: 'application/pdf',
          },
        );

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement(
          'a',
        );

      anchor.href = url;
      anchor.download =
        outputFileName(
          pdfFile.name,
        );

      document.body.appendChild(
        anchor,
      );

      anchor.click();
      anchor.remove();

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            url,
          );
        },
        1500,
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : String(exportError),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="visual-signature-shell">
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          const file =
            event.target.files?.[0];

          if (file) {
            void choosePdf(file);
          }

          event.currentTarget.value =
            '';
        }}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        hidden
        onChange={(event) => {
          const file =
            event.target.files?.[0];

          if (file) {
            void importSignature(
              file,
            );
          }

          event.currentTarget.value =
            '';
        }}
      />

      <header className="visual-signature-appbar">
        <button
          type="button"
          className="visual-signature-brand"
          onClick={onClose}
          title="Torna agli strumenti"
        >
          <span
            className="visual-signature-brand-mark"
            aria-hidden="true"
          >
            G
          </span>

          <span>
            Giumag PDF
          </span>
        </button>

        <div className="visual-signature-tool-identity">
          <strong>
            Firma visiva
          </strong>

          <span>
            <i aria-hidden="true" />
            Firma grafica locale
          </span>
        </div>

        <div className="visual-signature-appbar-actions">
          {pdfFile ? (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  pdfInputRef
                    .current
                    ?.click()
                }
              >
                Sostituisci PDF
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={
                  !signature ||
                  signedPageCount === 0 ||
                  exporting
                }
                onClick={() => {
                  void exportPdf();
                }}
              >
                {exporting
                  ? 'Creazione PDF…'
                  : 'Scarica PDF firmato'}
              </button>
            </>
          ) : (
            <span
              className="visual-signature-appbar-spacer"
              aria-hidden="true"
            />
          )}
        </div>
      </header>

      <div
        className={
          pdfBytes
            ? 'visual-signature-hero is-compact'
            : 'visual-signature-hero'
        }
      >
        <span className="visual-signature-eyebrow">
          FIRMA VISIVA
        </span>

        <h1>
          Metti la tua firma dove serve.
        </h1>

        <p>
          Disegna o importa la firma, posizionala sulle pagine
          e scarica il PDF. Tutto viene elaborato localmente.
        </p>
      </div>

      <div className="visual-signature-notice">
        <strong>
          Firma visiva
        </strong>

        <span>
          Aggiunge la rappresentazione grafica della firma al documento. Non è una firma digitale crittografica o certificata.
        </span>
      </div>

      {error ? (
        <div
          className="visual-signature-error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!pdfBytes ? (
        <div className="visual-signature-empty">
          <div className="visual-signature-empty-card">
            <span className="visual-signature-empty-icon">
              PDF
            </span>

            <h2>
              Scegli il documento da firmare
            </h2>

            <p>
              Il file resta sul dispositivo e viene elaborato localmente.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                pdfInputRef
                  .current
                  ?.click()
              }
            >
              Scegli PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="visual-signature-layout">
          <aside className="visual-signature-panel">
            <div className="visual-signature-panel-heading">
              <span className="visual-signature-step">
                1
              </span>

              <div>
                <h2>
                  Crea la firma
                </h2>

                <p>
                  Disegnala oppure importa un’immagine.
                </p>
              </div>
            </div>

            <div className="visual-signature-tabs">
              <button
                type="button"
                className={
                  mode === 'draw'
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  setMode('draw')
                }
              >
                Disegna
              </button>

              <button
                type="button"
                className={
                  mode === 'import'
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  setMode('import')
                }
              >
                Importa
              </button>
            </div>

            {mode === 'draw' ? (
              <SignaturePad
                onUse={useDrawing}
              />
            ) : (
              <div className="visual-signature-import-card">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    imageInputRef
                      .current
                      ?.click()
                  }
                >
                  Scegli PNG o JPG
                </button>

                <p>
                  Per un risultato migliore usa un PNG con sfondo trasparente.
                </p>
              </div>
            )}

            {signature ? (
              <div className="visual-signature-selected">
                <span>
                  Firma pronta
                </span>

                <img
                  src={
                    signature.previewUrl
                  }
                  alt=""
                />

                <small>
                  {signature.name}
                </small>
              </div>
            ) : null}

            <div className="visual-signature-panel-heading visual-signature-place-heading">
              <span className="visual-signature-step">
                2
              </span>

              <div>
                <h2>
                  Posizionala
                </h2>

                <p>
                  Trascina la firma e usa il punto in basso a destra per ridimensionarla.
                </p>
              </div>
            </div>

            <div className="visual-signature-summary">
              <span>
                Pagine firmate
              </span>

              <strong>
                {signedPageCount}
              </strong>
            </div>

            {placements[
              pageIndex
            ] ? (
              <button
                type="button"
                className="visual-signature-remove"
                onClick={() =>
                  updateCurrentPlacement(
                    null,
                  )
                }
              >
                Rimuovi firma da questa pagina
              </button>
            ) : null}
          </aside>

          <main className="visual-signature-document">
            <div className="visual-signature-document-toolbar">
              <div>
                <strong>
                  {pdfFile?.name}
                </strong>

                <span>
                  Pagina {pageIndex + 1} di {pageCount}
                </span>
              </div>

              <div
                className="visual-signature-pagination"
                aria-label="Navigazione pagine"
              >
                <button
                  type="button"
                  className="visual-signature-page-nav-button"
                  disabled={
                    pageIndex <= 0
                  }
                  onClick={
                    previousPage
                  }
                >
                  <span aria-hidden="true">
                    ‹
                  </span>
                  Precedente
                </button>

                <button
                  type="button"
                  className="visual-signature-page-nav-button"
                  disabled={
                    pageIndex >=
                    pageCount - 1
                  }
                  onClick={
                    nextPage
                  }
                >
                  Successiva
                  <span aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            </div>

            <VisualSignatureCanvas
              pdfBytes={pdfBytes}
              pageIndex={pageIndex}
              signaturePreviewUrl={
                signature
                  ?.previewUrl ??
                null
              }
              signatureAspectRatio={
                signature
                  ?.aspectRatio ??
                3
              }
              placement={
                placements[
                  pageIndex
                ] ?? null
              }
              onPlacementChange={
                updateCurrentPlacement
              }
              onPageCount={
                setPageCount
              }
            />
          </main>
        </div>
      )}
    </section>
  );
}