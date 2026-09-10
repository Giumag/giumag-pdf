/// <reference lib="webworker" />

import {
  BrowserPdfEngine,
} from '@giumag/pdf-engine';

type Request =
  | {
      id: number;
      type: 'inspect';
      bytes: ArrayBuffer;
    }
  | {
      id: number;
      type: 'unlock';
      bytes: ArrayBuffer;
      password: string;
    };

const engine =
  new BrowserPdfEngine();

self.addEventListener(
  'message',
  async (
    event:
      MessageEvent<Request>,
  ) => {
    const request =
      event.data;

    try {
      if (
        request.type ===
        'inspect'
      ) {
        const info =
          await engine
            .inspectProtection(
              new Uint8Array(
                request.bytes,
              ),
            );

        self.postMessage({
          id: request.id,
          ok: true,
          type: 'inspect',
          info,
        });

        return;
      }

      const output =
        await engine.unlock(
          new Uint8Array(
            request.bytes,
          ),
          request.password,
        );

      const copy =
        new Uint8Array(
          output.byteLength,
        );

      copy.set(output);

      self.postMessage(
        {
          id: request.id,
          ok: true,
          type: 'unlock',
          bytes:
            copy.buffer,
        },
        [
          copy.buffer,
        ],
      );
    }
    catch (caught) {
      self.postMessage({
        id: request.id,
        ok: false,
        message:
          caught instanceof Error
            ? caught.message
            : 'Impossibile sbloccare il PDF.',
      });
    }
  },
);
