import {
  applyVisualSignature,
  type VisualSignatureMimeType,
  type VisualSignaturePlacement,
} from '@giumag/pdf-engine';

interface SignRequest {
  id: number;
  pdfBytes: Uint8Array;
  signatureBytes: Uint8Array;
  mimeType: VisualSignatureMimeType;
  placements: VisualSignaturePlacement[];
}

interface SignSuccess {
  id: number;
  ok: true;
  bytes: Uint8Array;
}

interface SignFailure {
  id: number;
  ok: false;
  error: string;
}

self.addEventListener(
  'message',
  async (
    event: MessageEvent<SignRequest>,
  ) => {
    const request = event.data;

    try {
      const bytes =
        await applyVisualSignature({
          pdfBytes: request.pdfBytes,
          signatureBytes:
            request.signatureBytes,
          mimeType: request.mimeType,
          placements: request.placements,
        });

      const response: SignSuccess = {
        id: request.id,
        ok: true,
        bytes,
      };

      self.postMessage(
        response,
        {
          transfer: [bytes.buffer],
        },
      );
    } catch (error) {
      const response: SignFailure = {
        id: request.id,
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };

      self.postMessage(response);
    }
  },
);