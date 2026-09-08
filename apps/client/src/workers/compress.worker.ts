import {
  BrowserPdfEngine,
  type CompressionPreset,
} from '@giumag/pdf-engine';

interface WorkerRequest {
  id: number;
  bytes: ArrayBuffer;
  preset: CompressionPreset;
}

interface WorkerSuccess {
  id: number;
  ok: true;
  bytes: ArrayBuffer;
}

interface WorkerFailure {
  id: number;
  ok: false;
  error: string;
}

interface CompressionWorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ): void;

  postMessage(
    message: WorkerSuccess | WorkerFailure,
    transfer?: Transferable[],
  ): void;
}

const workerScope =
  self as unknown as CompressionWorkerScope;

const engine = new BrowserPdfEngine();

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Impossibile comprimere questo documento PDF.';
}

workerScope.addEventListener(
  'message',
  async (event: MessageEvent<WorkerRequest>) => {
    const { id, bytes, preset } = event.data;

    try {
      const result = await engine.compress(
        new Uint8Array(bytes),
        preset,
      );

      const output = result.buffer.slice(
        result.byteOffset,
        result.byteOffset + result.byteLength,
      ) as ArrayBuffer;

      const response: WorkerSuccess = {
        id,
        ok: true,
        bytes: output,
      };

      workerScope.postMessage(
        response,
        [response.bytes],
      );
    } catch (error) {
      const response: WorkerFailure = {
        id,
        ok: false,
        error: errorMessage(error),
      };

      workerScope.postMessage(response);
    }
  },
);
