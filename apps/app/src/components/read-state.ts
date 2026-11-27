// Transport failures may keep an existing result; an explicit denial/removal may not.
export interface ReadSnapshot {
  isError: boolean;
  isFetching: boolean;
  fetchStatus?: 'fetching' | 'paused' | 'idle';
  error?: unknown;
}
export function canShowReadData<T>(q: ReadSnapshot & { data: T | undefined }) {
  const e = q.error;
  return (
    q.data !== undefined &&
    !(
      e &&
      typeof e === 'object' &&
      'status' in e &&
      (e.status === 401 || e.status === 403 || e.status === 404 || e.status === 410)
    )
  );
}
