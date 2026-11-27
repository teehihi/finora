// A lost response does not mean the server rolled back the upload. This helper never replays it.
export class UploadOutcomeUnknown extends Error {
  constructor() {
    super('Document upload response unavailable');
  }
}
export async function awaitUploadResponse<T>(
  send: (signal: AbortSignal) => Promise<T>,
  deadlineMs = 90_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      send(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new UploadOutcomeUnknown());
          controller.abort();
        }, deadlineMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
