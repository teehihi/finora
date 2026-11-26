import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { dark, light } from '@finora/design-tokens';
import { DesignContext } from '@finora/ui';
import type { Preferences } from '@finora/contracts';
import { auth, api } from '../services/client';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 }, mutations: { retry: 0 } },
});
export const usePrefs = create<Preferences & { set: (value: Preferences) => void }>((set) => ({
  locale: 'vi-VN',
  appearance: 'light',
  set,
}));
export function useAccount() {
  const { data } = auth.useSession();
  return useQuery({
    queryKey: ['account', data?.user.id],
    queryFn: api.account,
    enabled: !!data?.user.id,
  });
}
function Theme({ children }: { children: React.ReactNode }) {
  const account = useAccount();
  const { locale, appearance, set } = usePrefs();
  const scheme = useColorScheme();
  useEffect(() => {
    if (account.data) set(account.data.preferences);
  }, [account.data, set]);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);
  return (
    <DesignContext.Provider
      value={{
        locale,
        colors:
          appearance === 'dark' || (appearance === 'system' && scheme === 'dark') ? dark : light,
      }}
    >
      {children}
    </DesignContext.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme>{children}</Theme>
    </QueryClientProvider>
  );
}
