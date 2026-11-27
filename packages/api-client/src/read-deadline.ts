export const readDeadlineMs = 15_000;

export class ReadDeadlineError extends Error {
  constructor() {
    super('Finora API read deadline exceeded');
    this.name = 'ReadDeadlineError';
  }
}

function abortError() {
  const error = new Error('Finora API read cancelled');
  error.name = 'AbortError';
  return error;
}

/** Bound the full read, including response body parsing, without retrying it here. */
export async function withReadDeadline<T>(
  read: (signal: AbortSignal) => Promise<T>,
  caller?: AbortSignal,
  ms = readDeadlineMs,
): Promise<T> {
  if (caller?.aborted) throw abortError();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    cancel = () => {
      reject(abortError());
      controller.abort();
    };
    caller?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      // Record the typed error before aborting the underlying transport.
      reject(new ReadDeadlineError());
      controller.abort();
    }, ms);
  });
  try {
    return await Promise.race([deadline, read(controller.signal)]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (cancel) caller?.removeEventListener('abort', cancel);
  }
}
