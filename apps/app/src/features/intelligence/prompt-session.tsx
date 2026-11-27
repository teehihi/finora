import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Store = Map<string, string>;
const PromptSession = createContext<Store | null>(null);

// The workspace keys this by account. Drafts survive route replacement without
// being persisted, or leaking between accounts or different loan contexts.
export function FinPromptSession({ children }: { children: ReactNode }) {
  const store = useRef<Store>(new Map());
  return <PromptSession.Provider value={store.current}>{children}</PromptSession.Provider>;
}

export function useFinPromptDraft(scope: string | undefined, prefill: string) {
  const store = useContext(PromptSession);
  const key = scope ?? '';
  const [prompt, setPrompt] = useState(() => prefill || store?.get(key) || '');
  const update = useCallback(
    (next: string) => {
      if (next) store?.set(key, next);
      else store?.delete(key);
      setPrompt(next);
    },
    [key, store],
  );
  return [prompt, update] as const;
}
