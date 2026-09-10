import {
  createWorker,
} from 'tesseract.js';

import type {
  OcrPdfPage,
  OcrPdfTextLine,
} from '@giumag/pdf-engine';

import {
  PdfToImagesWorkerClient,
} from './pdf-to-images-worker';

import {
  buildSearchablePdfInWorker,
} from './ocr-pdf-build-worker';

export type OcrLanguage =
  | 'ita'
  | 'eng'
  | 'ita+eng';

export type OcrPdfPhase =
  | 'rendering'
  | 'recognizing'
  | 'building';

export interface OcrPdfProgress {
  phase: OcrPdfPhase;
  completed: number;
  total: number;
  pageIndex: number;
  pageProgress: number;
  percent: number;
}

export interface OcrPdfResult {
  bytes: Uint8Array;
  pages: number;
  words: number;
  confidence: number;
}

export interface OcrPdfCallbacks {
  onProgress?: (
    progress:
      OcrPdfProgress,
  ) => void;
}

const OCR_RENDER_SCALE = 2;

const OCR_FALLBACK_RENDER_SCALE =
  1.35;

const OCR_JPEG_QUALITY =
  0.88;

const OCR_RENDER_FIRST_PAGE_TIMEOUT_MS =
  25_000;

const TESSERACT_BASE =
  new URL(
    `${import.meta.env.BASE_URL}tesseract/`,
    window.location.href,
  )
    .href
    .replace(
      /\/$/,
      '',
    );

function describeOcrError(
  value: unknown,
): string {
  if (
    value instanceof Error &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    value &&
    typeof value === 'object' &&
    'message' in value
  ) {
    const message =
      String(
        (
          value as {
            message?: unknown;
          }
        ).message ?? '',
      ).trim();

    if (message) {
      return message;
    }
  }

  try {
    const serialized =
      JSON.stringify(
        value,
      );

    if (
      serialized &&
      serialized !== '{}'
    ) {
      return serialized;
    }
  } catch {
    // Ignora valori non serializzabili.
  }

  return String(
    value,
  );
}

async function ensureOcrAsset(
  url: string,
  label: string,
) {
  let response:
    Response;

  try {
    response =
      await fetch(
        url,
        {
          cache: 'default',
        },
      );
  } catch (error) {
    throw new Error(
      `${label} non raggiungibile: ${describeOcrError(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `${label} non disponibile (${response.status} ${response.statusText}).`,
    );
  }
}

function languageCodes(
  language: OcrLanguage,
) {
  if (
    language ===
    'ita+eng'
  ) {
    return [
      'ita',
      'eng',
    ];
  }

  return [
    language,
  ];
}

export class OcrPdfProcessor {
  private cancelled = false;

  private renderer:
    PdfToImagesWorkerClient |
    null = null;

  private ocrWorker:
    Awaited<
      ReturnType<
        typeof createWorker
      >
    > |
    null = null;

  private ensureActive() {
    if (this.cancelled) {
      throw new Error(
        'OCR annullato.',
      );
    }
  }

  cancel() {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;

    this.renderer?.terminate();

    this.renderer = null;

    if (this.ocrWorker) {
      void this.ocrWorker
        .terminate()
        .catch(
          () => undefined,
        );

      this.ocrWorker = null;
    }
  }

  async process(
    bytes: Uint8Array,
    language: OcrLanguage,
    callbacks:
      OcrPdfCallbacks = {},
  ): Promise<OcrPdfResult> {
    if (
      bytes.byteLength ===
      0
    ) {
      throw new Error(
        'Il PDF è vuoto.',
      );
    }

    this.ensureActive();

    let activePageIndex = 0;
    let activePosition = 0;
    let activeTotal = 1;

    try {
      const renderWithScale =
        async (
          scale: number,
          fallback: boolean,
        ) => {
          this.ensureActive();

          this.renderer =
            new PdfToImagesWorkerClient();

          let firstPageReceived =
            false;

          let timeoutId:
            ReturnType<
              typeof setTimeout
            > |
            undefined;

          const firstPagePromise =
            new Promise<void>(
              (resolve, reject) => {
                timeoutId =
                  setTimeout(
                    () => {
                      if (
                        firstPageReceived
                      ) {
                        return;
                      }

                      reject(
                        new Error(
                          'OCR_RENDER_TIMEOUT',
                        ),
                      );
                    },
                    OCR_RENDER_FIRST_PAGE_TIMEOUT_MS,
                  );

                void resolve;
              },
            );

          const renderPromise =
            this.renderer.render(
              bytes,
              {
                format: 'jpeg',
                scale,
                jpegQuality:
                  OCR_JPEG_QUALITY,
              },
              {
                onPage:
                  (image) => {
                    if (
                      !firstPageReceived
                    ) {
                      firstPageReceived =
                        true;

                      if (
                        timeoutId !==
                        undefined
                      ) {
                        clearTimeout(
                          timeoutId,
                        );

                        timeoutId =
                          undefined;
                      }
                    }

                    callbacks
                      .onProgress?.({
                        phase:
                          'rendering',
                        completed: 0,
                        total: 1,
                        pageIndex:
                          image
                            .pageIndex,
                        pageProgress:
                          0.9,
                        percent:
                          fallback
                            ? 8
                            : 4,
                      });
                  },

                onProgress:
                  (progress) => {
                    callbacks
                      .onProgress?.({
                        phase:
                          'rendering',
                        completed:
                          progress
                            .completed,
                        total:
                          progress
                            .total,
                        pageIndex:
                          progress
                            .pageIndex,
                        pageProgress: 1,
                        percent:
                          Math.max(
                            fallback
                              ? 8
                              : 4,
                            Math.round(
                              (
                                progress
                                  .completed /
                                progress
                                  .total
                              ) *
                                25,
                            ),
                          ),
                      });
                  },
              },
            );

          /*
           * Il wrapper originale invia onPage
           * appena una pagina è pronta.
           *
           * Se non arriva neanche la prima pagina
           * entro il timeout, il renderer è
           * effettivamente bloccato e viene
           * ricreato a risoluzione più leggera.
           */
          const watchdog =
            firstPagePromise.catch(
              (error) => {
                this.renderer
                  ?.terminate();

                this.renderer =
                  null;

                throw error;
              },
            );

          try {
            const result =
              await Promise.race([
                renderPromise,
                watchdog.then(
                  () =>
                    new Promise<
                      never
                    >(
                      () => undefined,
                    ),
                ),
              ]);

            if (
              timeoutId !==
              undefined
            ) {
              clearTimeout(
                timeoutId,
              );
            }

            this.renderer
              ?.terminate();

            this.renderer =
              null;

            return result;
          } catch (error) {
            if (
              timeoutId !==
              undefined
            ) {
              clearTimeout(
                timeoutId,
              );
            }

            this.renderer
              ?.terminate();

            this.renderer =
              null;

            throw error;
          }
        };

      callbacks.onProgress?.({
        phase: 'rendering',
        completed: 0,
        total: 1,
        pageIndex: 0,
        pageProgress: 0,
        percent: 1,
      });

      let renderScale =
        OCR_RENDER_SCALE;

      let images;

      try {
        images =
          await renderWithScale(
            OCR_RENDER_SCALE,
            false,
          );
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            error.message ===
              'OCR_RENDER_TIMEOUT'
          )
        ) {
          throw error;
        }

        this.ensureActive();

        renderScale =
          OCR_FALLBACK_RENDER_SCALE;

        callbacks
          .onProgress?.({
            phase:
              'rendering',
            completed: 0,
            total: 1,
            pageIndex: 0,
            pageProgress: 0,
            percent: 5,
          });

        try {
          images =
            await renderWithScale(
              OCR_FALLBACK_RENDER_SCALE,
              true,
            );
        } catch (
          fallbackError
        ) {
          if (
            fallbackError instanceof
              Error &&
            fallbackError.message ===
              'OCR_RENDER_TIMEOUT'
          ) {
            throw new Error(
              'Il rendering del PDF non risponde. Il documento potrebbe contenere una pagina molto complessa o non essere compatibile con il renderer corrente.',
            );
          }

          throw fallbackError;
        }
      }

      this.ensureActive();

      if (
        images.length ===
        0
      ) {
        throw new Error(
          'Il PDF non contiene pagine elaborabili.',
        );
      }

      activeTotal =
        images.length;

      callbacks.onProgress?.({
        phase:
          'recognizing',
        completed: 0,
        total:
          activeTotal,
        pageIndex:
          images[0]
            .pageIndex,
        pageProgress: 0,
        percent: 25,
      });

      const workerUrl =
        `${TESSERACT_BASE}/worker/worker.min.js`;

      const languageUrls =
        languageCodes(
          language,
        ).map(
          (code) =>
            `${TESSERACT_BASE}/lang/${code}.traineddata.gz`,
        );

      /*
       * Verifica prima gli asset che possiamo
       * controllare direttamente. In questo modo
       * un 404/offline errato produce un messaggio
       * chiaro invece di una rejection opaca
       * proveniente dal worker.
       */
      await ensureOcrAsset(
        workerUrl,
        'Worker OCR locale',
      );

      for (
        let languageIndex = 0;
        languageIndex <
        languageUrls.length;
        languageIndex += 1
      ) {
        await ensureOcrAsset(
          languageUrls[
            languageIndex
          ],
          `Dati lingua OCR ${
            languageCodes(
              language,
            )[
              languageIndex
            ]
          }`,
        );
      }

      let workerRuntimeError =
        '';

      try {
        this.ocrWorker =
          await createWorker(
            languageCodes(
              language,
            ),
            undefined,
            {
              workerPath:
                workerUrl,

              corePath:
                `${TESSERACT_BASE}/core`,

              langPath:
                `${TESSERACT_BASE}/lang`,

              gzip: true,

              /*
               * Gli asset sono locali e same-origin.
               * Carichiamo direttamente il worker
               * invece di riconvertirlo in Blob URL.
               */
              workerBlobURL:
                false,

              errorHandler:
                (error) => {
                  workerRuntimeError =
                    describeOcrError(
                      error,
                    );

                  console.error(
                    '[Giumag OCR] Tesseract worker error:',
                    error,
                  );
                },

              logger:
                (message) => {
                  if (
                    message.status !==
                    'recognizing text'
                  ) {
                    return;
                  }

                  const pageProgress =
                    Math.max(
                      0,
                      Math.min(
                        1,
                        message.progress,
                      ),
                    );

                  callbacks
                    .onProgress?.({
                      phase:
                        'recognizing',
                      completed:
                        activePosition,
                      total:
                        activeTotal,
                      pageIndex:
                        activePageIndex,
                      pageProgress,
                      percent:
                        Math.round(
                          25 +
                            (
                              (
                                activePosition +
                                pageProgress
                              ) /
                              activeTotal
                            ) *
                              70,
                        ),
                    });
                },
            },
          );
      } catch (error) {
        const detail =
          workerRuntimeError ||
          describeOcrError(
            error,
          );

        throw new Error(
          `Impossibile avviare il motore OCR locale: ${detail}`,
        );
      }

      this.ensureActive();

      await this.ocrWorker
        .setParameters({
          user_defined_dpi:
            String(
              72 *
                renderScale,
            ),
          preserve_interword_spaces:
            '1',
        });

      const pages:
        OcrPdfPage[] = [];

      let wordCount = 0;
      let confidenceTotal = 0;
      let confidenceCount = 0;

      for (
        let position = 0;
        position < images.length;
        position += 1
      ) {
        this.ensureActive();

        const image =
          images[position];

        activePosition =
          position;

        activePageIndex =
          image.pageIndex;

        callbacks.onProgress?.({
          phase:
            'recognizing',
          completed:
            position,
          total:
            activeTotal,
          pageIndex:
            image.pageIndex,
          pageProgress: 0,
          percent:
            Math.round(
              25 +
                (
                  position /
                  activeTotal
                ) *
                  70,
            ),
        });

        const imageCopy =
          new Uint8Array(
            image.bytes
              .byteLength,
          );

        imageCopy.set(
          image.bytes,
        );

        const blob =
          new Blob(
            [
              imageCopy
                .buffer as ArrayBuffer,
            ],
            {
              type:
                image.mimeType,
            },
          );

        const result =
          await this.ocrWorker
            .recognize(
              blob,
              {},
              {
                text: true,
                blocks: true,
              },
            );

        this.ensureActive();

        const lines:
          OcrPdfTextLine[] = [];

        for (
          const block
          of result.data
            .blocks ?? []
        ) {
          for (
            const paragraph
            of block.paragraphs
          ) {
            for (
              const line
              of paragraph.lines
            ) {
              /*
               * Il livello testuale deve seguire
               * la geometria delle singole parole.
               *
               * Usare il bounding box dell'intera
               * riga sposta le parole quando nel
               * documento ci sono colonne, tabelle
               * o grandi spazi orizzontali.
               */
              for (
                const word
                of line.words
              ) {
                const text =
                  word.text
                    .replace(
                      /\s+/g,
                      ' ',
                    )
                    .trim();

                if (!text) {
                  continue;
                }

                wordCount += 1;

                if (
                  Number.isFinite(
                    word.confidence,
                  ) &&
                  word.confidence >=
                    0
                ) {
                  confidenceTotal +=
                    word.confidence;

                  confidenceCount +=
                    1;
                }

                if (
                  word.bbox.x1 <=
                    word.bbox.x0 ||
                  word.bbox.y1 <=
                    word.bbox.y0
                ) {
                  continue;
                }

                lines.push({
                  text,
                  x0:
                    word.bbox.x0,
                  y0:
                    word.bbox.y0,
                  x1:
                    word.bbox.x1,
                  y1:
                    word.bbox.y1,
                  confidence:
                    word.confidence,
                });
              }
            }
          }
        }

        pages.push({
          image: {
            bytes:
              image.bytes,
            format:
              image.format,
          },
          pixelWidth:
            image.width,
          pixelHeight:
            image.height,
          pageWidth:
            image.width /
            renderScale,
          pageHeight:
            image.height /
            renderScale,
          lines,
        });

        callbacks.onProgress?.({
          phase:
            'recognizing',
          completed:
            position + 1,
          total:
            activeTotal,
          pageIndex:
            image.pageIndex,
          pageProgress: 1,
          percent:
            Math.round(
              25 +
                (
                  (
                    position +
                    1
                  ) /
                  activeTotal
                ) *
                  70,
            ),
        });
      }

      if (
        wordCount ===
        0
      ) {
        throw new Error(
          'Non è stato riconosciuto testo nel documento. Prova con una scansione più nitida o con un’altra lingua.',
        );
      }

      await this.ocrWorker
        .terminate();

      this.ocrWorker = null;

      this.ensureActive();

      callbacks.onProgress?.({
        phase:
          'building',
        completed:
          activeTotal,
        total:
          activeTotal,
        pageIndex:
          images[
            images.length - 1
          ].pageIndex,
        pageProgress: 1,
        percent: 96,
      });

      const output =
        await buildSearchablePdfInWorker(
          pages,
        );

      this.ensureActive();

      callbacks.onProgress?.({
        phase:
          'building',
        completed:
          activeTotal,
        total:
          activeTotal,
        pageIndex:
          images[
            images.length - 1
          ].pageIndex,
        pageProgress: 1,
        percent: 100,
      });

      return {
        bytes:
          output,
        pages:
          activeTotal,
        words:
          wordCount,
        confidence:
          confidenceCount >
          0
            ? Math.round(
                confidenceTotal /
                  confidenceCount,
              )
            : 0,
      };
    } finally {
      this.renderer?.terminate();

      this.renderer = null;

      if (this.ocrWorker) {
        await this.ocrWorker
          .terminate()
          .catch(
            () => undefined,
          );

        this.ocrWorker = null;
      }
    }
  }
}