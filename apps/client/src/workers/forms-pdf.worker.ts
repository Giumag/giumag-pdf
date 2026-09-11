import {
  fillPdfForm,
  inspectPdfForm,
} from '@giumag/pdf-engine';

import type {
  FormsPdfWorkerRequest,
  FormsPdfWorkerResponse,
} from '../lib/forms-pdf-worker';

function describeError(
  value: unknown,
) {
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

  return 'Errore Moduli PDF sconosciuto.';
}

self.onmessage = async (
  event:
    MessageEvent<
      FormsPdfWorkerRequest
    >,
) => {
  try {
    if (
      event.data.action ===
      'inspect'
    ) {
      const result =
        await inspectPdfForm(
          event.data.bytes,
        );

      const response:
        FormsPdfWorkerResponse = {
          ok: true,
          result,
        };

      self.postMessage(
        response,
      );

      return;
    }

    const result =
      await fillPdfForm(
        event.data.bytes,
        event.data.updates,
        event.data.options,
      );

    const response:
      FormsPdfWorkerResponse = {
        ok: true,
        result,
      };

    self.postMessage(
      response,
    );
  } catch (error) {
    const response:
      FormsPdfWorkerResponse = {
        ok: false,
        error:
          describeError(
            error,
          ),
      };

    self.postMessage(
      response,
    );
  }
};