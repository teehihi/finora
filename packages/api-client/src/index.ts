import { withReadDeadline } from './read-deadline';
export { ReadDeadlineError, withReadDeadline } from './read-deadline';
import type {
  AccountData,
  Product,
  PublicLoanProduct,
  PublicLoanSearch,
  LoanMatchRequest,
  LoanMatchResult,
  LoanInput,
  Estimate,
  Saved,
  SaveCustomSimulation,
  Profile,
  Preferences,
  ChatTurn,
  ChatRequest,
  RepaymentLedger,
  RepaymentPaymentUpdate,
  TrackedRepayment,
  TrackRepaymentInput,
  TwinComparisonRequest,
  TwinComparison,
} from '@finora/contracts';
export interface Readiness {
  monthlyBudget: number;
  debtToIncome: number;
  target: number;
}
export class ApiError extends Error {
  constructor(public status: number) {
    super('Finora API ' + status);
  }
}
export function createApi(
  base: string,
  headers: () => Record<string, string>,
  transport: typeof fetch = fetch,
) {
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    async function read(signal?: AbortSignal) {
      const r = await transport(base + '/api/' + path, {
        method,
        signal,
        credentials: 'include',
        headers: { ...headers(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new ApiError(r.status);
      return (await r.json()) as T;
    }
    // Mutations and streams have their own completion and reconciliation
    // semantics. Never silently time out a write and prompt a duplicate.
    return method === 'GET' ? withReadDeadline(read) : read();
  }
  return {
    account: () => request<AccountData & { readiness: Readiness | null }>('account'),
    profile: (p: Profile) => request<Profile>('profile', 'PUT', p),
    preferences: (p: Preferences) => request<Preferences>('preferences', 'PUT', p),
    catalog: () => request<Product[]>('catalog'),
    publicCatalog: (filters: PublicLoanSearch = {}) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const query = params.toString();
      return request<PublicLoanProduct[]>('intelligence/catalog' + (query ? '?' + query : ''));
    },
    publicProduct: (id: string) =>
      request<PublicLoanProduct>('intelligence/catalog/' + encodeURIComponent(id)),
    loanMatches: (input: LoanMatchRequest) =>
      request<LoanMatchResult>('intelligence/catalog/matches', 'POST', input),
    product: (id: string) => request<Product>('catalog/' + encodeURIComponent(id)),
    preview: (productId: string, input: LoanInput) =>
      request<Estimate>('simulations/preview', 'POST', { productId, input }),
    save: (productId: string, input: LoanInput, requestId: string) =>
      request<Saved>('simulations', 'POST', { productId, input, requestId }),
    saveCustom: (input: SaveCustomSimulation) =>
      request<Saved>('simulations/custom', 'POST', input),
    saved: () => request<Saved[]>('simulations'),
    detail: (id: string) => request<Saved>('simulations/' + encodeURIComponent(id)),
    compareTwin: (input: TwinComparisonRequest) =>
      request<TwinComparison>('digital-twin/compare', 'POST', input),
    compareSavedTwin: (id: string, input: Omit<TwinComparisonRequest, 'loan'>) =>
      request<TwinComparison>(
        'simulations/' + encodeURIComponent(id) + '/digital-twin',
        'POST',
        input,
      ),
    repayments: () => request<RepaymentLedger>('repayments'),
    trackRepayment: (input: TrackRepaymentInput) =>
      request<TrackedRepayment>('repayments', 'POST', input),
    setRepaymentPaid: (id: string, period: number, input: RepaymentPaymentUpdate) =>
      request<{ paid: boolean; statusChangedAt: string }>(
        'repayments/' + encodeURIComponent(id) + '/payments/' + encodeURIComponent(period),
        'PUT',
        input,
      ),
    clearHistory: () => request<{ removed: number }>('assistant/history', 'DELETE'),
    history: () => request<ChatTurn[]>('assistant/history'),
    async stream(input: ChatRequest, signal: AbortSignal, onDelta: (text: string) => void) {
      const r = await transport(base + '/api/assistant/stream', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers(), 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(input),
        signal,
      });
      if (!r.ok || !r.body) throw new ApiError(r.status);
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '',
        finished = false;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const line = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (!line.startsWith('data: ')) continue;
            const event = JSON.parse(line.slice(6));
            if (event.type === 'error') throw new Error('Stream failed');
            if (event.type === 'delta') onDelta(event.text);
            if (event.type === 'done') finished = true;
          }
        }
        if (!finished) throw new Error('Incomplete stream');
      } finally {
        reader.releaseLock();
      }
    },
  };
}
