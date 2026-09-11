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

let nextRepairId = 1;

function copiedBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(bytes);

  return copy.buffer;
}

export async function repairPdfInWorker(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const worker =
    new Worker(
      new URL(
        '../workers/repair-pdf.worker.ts',
        import.meta.url,
      ),
      {
        type: 'module',
        name: 'giumag-repair-pdf',
      },
    );

  const id =
    nextRepairId++;

  const input =
    copiedBuffer(bytes);

  try {
    return await new Promise<
      Uint8Array
    >(
      (
        resolve,
        reject,
      ) => {
        worker.addEventListener(
          'message',
          (
            event:
              MessageEvent<RepairResponse>,
          ) => {
            const response =
              event.data;

            if (
              response.id !== id
            ) {
              return;
            }

            if (!response.ok) {
              reject(
                new Error(
                  response.message,
                ),
              );

              return;
            }

            resolve(
              new Uint8Array(
                response.bytes,
              ),
            );
          },
          {
            once: true,
          },
        );

        worker.addEventListener(
          'error',
          (event) => {
            reject(
              new Error(
                event.message ||
                  'Il motore di riparazione PDF si è interrotto.',
              ),
            );
          },
          {
            once: true,
          },
        );

        worker.postMessage(
          {
            id,
            bytes: input,
          },
          [
            input,
          ],
        );
      },
    );
  } finally {
    worker.terminate();
  }
}