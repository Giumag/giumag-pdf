/// <reference lib="webworker" />

import {
  repairPdfDocument,
} from '@giumag/pdf-engine';

interface RepairRequest {
  id: number;
  bytes: ArrayBuffer;
}

type RepairResponse =
  | {
      id: number;
      ok: true;
      bytes: ArrayBuffer;
    }
  | {
      id: number;
      ok: false;
      message: string;
    };

self.addEventListener(
  'message',
  async (
    event:
      MessageEvent<RepairRequest>,
  ) => {
    const request =
      event.data;

    try {
      const output =
        await repairPdfDocument(
          new Uint8Array(
            request.bytes,
          ),
        );

      const copy =
        new Uint8Array(
          output.byteLength,
        );

      copy.set(output);

      const response:
        RepairResponse = {
          id: request.id,
          ok: true,
          bytes: copy.buffer,
        };

      self.postMessage(
        response,
        [
          copy.buffer,
        ],
      );
    } catch (caught) {
      const response:
        RepairResponse = {
          id: request.id,
          ok: false,
          message:
            caught instanceof Error
              ? caught.message
              : 'Impossibile riparare il PDF.',
        };

      self.postMessage(
        response,
      );
    }
  },
);