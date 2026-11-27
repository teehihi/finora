import {
  awaitUploadResponse,
  UploadOutcomeUnknown,
} from '../src/features/documents/upload-response';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TaskData, type LoadState } from '../src/components/task-surface';

const refetch = jest.fn();
function boundary(data: string | undefined, overrides: Partial<LoadState> = {}) {
  return (
    <TaskData
      query={{ data, isError: false, isFetching: false, refetch, ...overrides }}
      kind="rows"
    >
      {(value) => <Text>{value}</Text>}
    </TaskData>
  );
}
describe('Progressive section reads', () => {
  it('shows a skeleton only on cold load, retains content on refresh and on transport failure', async () => {
    const ui = await render(boundary(undefined, { isFetching: true }));
    expect(ui.getByTestId('task-rows-skeleton')).toBeTruthy();
    await ui.rerender(boundary('cached', { isFetching: true }));
    expect(ui.getByTestId('task-refresh-indicator')).toBeTruthy();
    expect(ui.getByText('cached')).toBeTruthy();
    expect(ui.queryByTestId('task-rows-skeleton')).toBeNull();
    await ui.rerender(boundary('cached', { isError: true, error: { status: 503 } }));
    expect(ui.getByText('cached')).toBeTruthy();
    await fireEvent.press(ui.getByRole('button'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 404, 410])('hides a previous result after HTTP %i', async (status) => {
    const ui = await render(boundary('private', { isError: true, error: { status } }));
    expect(ui.queryByText('private')).toBeNull();
    expect(ui.getByRole('button')).toBeTruthy();
  });
  it('does not pulse indefinitely or ask to retry when a cold query is paused', async () => {
    const ui = await render(boundary(undefined, { fetchStatus: 'paused' }));
    expect(ui.queryByTestId('task-rows-skeleton')).toBeNull();
    expect(ui.queryByRole('button')).toBeNull();
    expect(ui.getByText(/kết nối|connection/i)).toBeTruthy();
  });
});

describe('Document upload deadline', () => {
  it('does not send a second upload when a response is lost and the native fetch never settles', async () => {
    jest.useFakeTimers();
    const send = jest.fn((_signal: AbortSignal) => new Promise<never>(() => {}));
    try {
      const pending = expect(awaitUploadResponse(send, 1000)).rejects.toBeInstanceOf(
        UploadOutcomeUnknown,
      );
      jest.advanceTimersByTime(1000);
      await pending;
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0]?.[0].aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
