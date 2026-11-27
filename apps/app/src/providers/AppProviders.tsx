import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { onlineManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { create } from 'zustand';
import { dark, light } from '@finora/design-tokens';
import { DesignContext } from '@finora/ui';
import { ApiError, ReadDeadlineError } from '@finora/api-client';
import type { Preferences } from '@finora/contracts';
import { auth, api } from '../services/client';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failures, error) =>
        failures < 1 &&
        !(error instanceof ReadDeadlineError) &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      staleTime: 15000,
    },
    mutations: { retry: 0 },
  },
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
  const { locale, set } = usePrefs();
  const scheme = useColorScheme();
  // The launch theme is also the default while no account is known. Opting
  // into Dark/System is an account choice, not a guess based on the device.
  const activeAppearance = account.data?.preferences.appearance ?? 'light';
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
          activeAppearance === 'dark' || (activeAppearance === 'system' && scheme === 'dark')
            ? dark
            : light,
      }}
    >
      {children}
    </DesignContext.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    let receivedEvent = false;
    // A connected LAN may host dev API without reaching the public internet.
    // Only mark offline for a confirmed disconnect; the API deadline handles
    // DNS, captive portals, and connected-but-unreachable servers.
    const update = (isConnected?: boolean) => {
      if (alive && typeof isConnected === 'boolean') onlineManager.setOnline(isConnected);
    };
    const subscription = addNetworkStateListener(({ isConnected }) => {
      receivedEvent = true;
      update(isConnected);
    });
    void getNetworkStateAsync()
      .then(({ isConnected }) => {
        if (!receivedEvent) update(isConnected);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Theme>{children}</Theme>
    </QueryClientProvider>
  );
}
