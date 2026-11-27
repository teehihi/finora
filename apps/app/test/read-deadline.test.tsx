import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createApi, ReadDeadlineError, withReadDeadline } from '@finora/api-client';

const pending = <T,>() => new Promise<T>(() => undefined);
const jsonResponse = (json: () => Promise<unknown>) => ({ ok: true, json }) as Response;

describe('read deadlines', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('includes response-body parsing, aborts once and returns a distinct error', async () => {
    let signal: AbortSignal | null | undefined;
    const transport = jest.fn<typeof fetch>(async (_path, options) => {
      signal = options?.signal;
      return jsonResponse(() => pending());
    });
    const api = createApi('https://fixture.invalid', () => ({}), transport);
    const result = expect(api.repayments()).rejects.toBeInstanceOf(ReadDeadlineError);
    await jest.advanceTimersByTimeAsync(15_000);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('preserves cancellation and does not schedule a deadline after completion', async () => {
    const caller = new AbortController();
    const never = jest.fn((_signal: AbortSignal) => pending());
    const rejection = expect(withReadDeadline(never, caller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    caller.abort();
    await rejection;
    expect(never.mock.calls[0]?.[0].aborted).toBe(true);
    const notStarted = jest.fn(async () => 42);
    await expect(withReadDeadline(notStarted, caller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(notStarted).not.toHaveBeenCalled();
    await expect(withReadDeadline(async () => 42)).resolves.toBe(42);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not replay or time out a state-changing save', async () => {
    const transport = jest.fn<typeof fetch>(async () => pending<Response>());
    const api = createApi('https://fixture.invalid', () => ({}), transport);
    void api.clearHistory();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[1]?.signal).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });
});
