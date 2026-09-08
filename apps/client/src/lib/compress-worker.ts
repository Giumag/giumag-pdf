import type { CompressionPreset } from '@giumag/pdf-engine';

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

type WorkerResponse = WorkerSuccess | WorkerFailure;

interface PendingRequest {
  resolve: (bytes: Uint8Array) => void;
  reject: (error: Error) => void;
}

export class CompressionWorkerClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private closed = false;

  constructor() {
    this.worker = new Worker(
      new URL('../workers/compress.worker.ts', import.meta.url),
      {
        type: 'module',
        name: 'giumag-pdf-compress',
      },
    );

    this.worker.addEventListener(
      'message',
      (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const request = this.pending.get(response.id);

        if (!request) {
          return;
        }

        this.pending.delete(response.id);

        if (response.ok) {
          request.resolve(
            new Uint8Array(response.bytes),
          );
          return;
        }

        request.reject(
          new Error(response.error),
        );
      },
    );

    this.worker.addEventListener('error', (event) => {
      const message = event.message ||
        'Il motore di compressione si è arrestato in modo inatteso.';

      this.rejectAll(new Error(message));
    });
  }

  compress(
    bytes: Uint8Array,
    preset: CompressionPreset,
  ): Promise<Uint8Array> {
    if (this.closed) {
      return Promise.reject(
        new Error('Il motore di compressione non è più disponibile.'),
      );
    }

    const id = this.nextId;
    this.nextId += 1;

    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);

    const request: WorkerRequest = {
      id,
      bytes: copy.buffer,
      preset,
    };

    return new Promise<Uint8Array>((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
      });

      this.worker.postMessage(
        request,
        [request.bytes],
      );
    });
  }

  terminate() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.worker.terminate();

    this.rejectAll(
      new Error('Compressione annullata.'),
    );
  }

  private rejectAll(error: Error) {
    for (const request of this.pending.values()) {
      request.reject(error);
    }

    this.pending.clear();
  }
}
