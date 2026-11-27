import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Store = Map<string, string>;
const PromptSession = createContext<Store | null>(null);
const peers = ['/home', '/explore', '/loans', '/profile'] as const;
type FinPeer = (typeof peers)[number];
const FinPeerSession = createContext<() => FinPeer>(() => '/home');

// The workspace keys this by account. Drafts survive route replacement without
// being persisted, or leaking between accounts or different loan contexts.
export function FinPromptSession({ children, path }: { children: ReactNode; path: string }) {
  const store = useRef<Store>(new Map());
  const peer = useRef<FinPeer>('/home');
  const previousPeer = useCallback(() => peer.current, []);
  useEffect(() => {
    const picked = peers.find((route) => route === path);
    if (picked) peer.current = picked;
  }, [path]);
  return (
    <PromptSession.Provider value={store.current}>
      <FinPeerSession.Provider value={previousPeer}>{children}</FinPeerSession.Provider>
    </PromptSession.Provider>
  );
}

export function useFinPreviousPeer() {
  return useContext(FinPeerSession);
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
