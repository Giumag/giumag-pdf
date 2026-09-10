import {
  BrowserPdfEngine,
  type OcrPdfPage,
} from '@giumag/pdf-engine';

interface BuildRequest {
  type: 'build';
  pages: OcrPdfPage[];
}

interface BuildSuccess {
  type: 'success';
  bytes: ArrayBuffer;
}

interface BuildFailure {
  type: 'failure';
  error: string;
}

type BuildResponse =
  | BuildSuccess
  | BuildFailure;

interface OcrBuildWorkerScope {
  addEventListener(
    type: 'message',
    listener: (
      event:
        MessageEvent<BuildRequest>,
    ) => void,
  ): void;

  postMessage(
    message: BuildResponse,
    transfer?:
      Transferable[],
  ): void;
}

const workerScope =
  self as unknown as
    OcrBuildWorkerScope;

workerScope.addEventListener(
  'message',
  (
    event:
      MessageEvent<BuildRequest>,
  ) => {
    const request =
      event.data;

    const engine =
      new BrowserPdfEngine();

    void engine
      .createSearchablePdf(
        request.pages,
      )
      .then(
        (bytes) => {
          const copy =
            new Uint8Array(
              bytes.byteLength,
            );

          copy.set(
            bytes,
          );

          const buffer =
            copy.buffer;

          workerScope.postMessage(
            {
              type: 'success',
              bytes: buffer,
            },
            [
              buffer,
            ],
          );
        },
      )
      .catch(
        (error) => {
          workerScope.postMessage({
            type: 'failure',
            error:
              error instanceof Error
                ? error.message
                : 'Impossibile creare il PDF ricercabile.',
          });
        },
      );
  },
);