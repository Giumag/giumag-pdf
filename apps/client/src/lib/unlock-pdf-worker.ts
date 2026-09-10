import type {
  PdfProtectionInfo,
} from '@giumag/pdf-engine';

type WorkerRequest =
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

type WorkerResponse =
  | {
      id: number;
      ok: true;
      type: 'inspect';
      info: PdfProtectionInfo;
    }
  | {
      id: number;
      ok: true;
      type: 'unlock';
      bytes: ArrayBuffer;
    }
  | {
      id: number;
      ok: false;
      message: string;
    };

interface PendingRequest {
  resolve:
    (response: WorkerResponse) =>
      void;
  reject:
    (error: Error) =>
      void;
}

let worker:
  | Worker
  | null = null;

let nextId = 1;

const pending =
  new Map<
    number,
    PendingRequest
  >();

function rejectAll(
  error: Error,
) {
  for (
    const request
    of pending.values()
  ) {
    request.reject(error);
  }

  pending.clear();
}

function getWorker() {
  if (worker) {
    return worker;
  }

  worker =
    new Worker(
      new URL(
        '../workers/unlock-pdf.worker.ts',
        import.meta.url,
      ),
      {
        type: 'module',
      },
    );

  worker.addEventListener(
    'message',
    (
      event:
        MessageEvent<WorkerResponse>,
    ) => {
      const response =
        event.data;

      const request =
        pending.get(
          response.id,
        );

      if (!request) {
        return;
      }

      pending.delete(
        response.id,
      );

      if (!response.ok) {
        request.reject(
          new Error(
            response.message,
          ),
        );

        return;
      }

      request.resolve(
        response,
      );
    },
  );

  worker.addEventListener(
    'error',
    () => {
      rejectAll(
        new Error(
          'Il motore di sblocco PDF si è interrotto.',
        ),
      );

      worker?.terminate();
      worker = null;
    },
  );

  return worker;
}

function copiedBuffer(
  bytes: Uint8Array,
) {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(bytes);

  return copy.buffer;
}

type WorkerRequestWithoutId =
  | Omit<
      Extract<
        WorkerRequest,
        {
          type: 'inspect';
        }
      >,
      'id'
    >
  | Omit<
      Extract<
        WorkerRequest,
        {
          type: 'unlock';
        }
      >,
      'id'
    >;

function run(
  request:
    WorkerRequestWithoutId,
) {
  const id =
    nextId++;

  const activeWorker =
    getWorker();

  return new Promise<WorkerResponse>(
    (
      resolve,
      reject,
    ) => {
      pending.set(
        id,
        {
          resolve,
          reject,
        },
      );

      const payload =
        {
          ...request,
          id,
        } as WorkerRequest;

      activeWorker.postMessage(
        payload,
        [
          payload.bytes,
        ],
      );
    },
  );
}

export async function inspectUnlockPdfProtection(
  bytes: Uint8Array,
) {
  const response =
    await run({
      type: 'inspect',
      bytes:
        copiedBuffer(bytes),
    });

  if (
    !response.ok ||
    response.type !==
      'inspect'
  ) {
    throw new Error(
      'Risposta inattesa dal motore di sblocco.',
    );
  }

  return response.info;
}

export async function unlockPdfInWorker(
  bytes: Uint8Array,
  password: string,
) {
  const response =
    await run({
      type: 'unlock',
      bytes:
        copiedBuffer(bytes),
      password,
    });

  if (
    !response.ok ||
    response.type !==
      'unlock'
  ) {
    throw new Error(
      'Risposta inattesa dal motore di sblocco.',
    );
  }

  return new Uint8Array(
    response.bytes,
  );
}

export function terminateUnlockPdfWorker() {
  worker?.terminate();
  worker = null;

  rejectAll(
    new Error(
      'Il motore di sblocco PDF è stato chiuso.',
    ),
  );
}
