/// <reference lib="webworker" />

import {
  BrowserPdfEngine,
  type ProtectPdfOptions,
} from '@giumag/pdf-engine';

type Request =
  | {
      id: number;
      type: 'inspect';
      bytes: ArrayBuffer;
      password?: string;
    }
  | {
      id: number;
      type: 'protect';
      bytes: ArrayBuffer;
      options: ProtectPdfOptions;
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
              request.password,
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
        await engine.protect(
          new Uint8Array(
            request.bytes,
          ),
          request.options,
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
          type: 'protect',
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
            : 'Impossibile proteggere il PDF.',
      });
    }
  },
);