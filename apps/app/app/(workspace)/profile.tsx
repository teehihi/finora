import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Button, Text, useDesign } from '@finora/ui';
import { AccountScroll, useProfileChrome } from '../../src/features/profile-chrome';
import {
  AccountGroups,
  AccountHero,
  type AccountSection,
} from '../../src/features/profile-account-hub';
import { queryClient, usePrefs } from '../../src/providers/AppProviders';
import { auth } from '../../src/services/client';
import profileCover from '../../assets/brand/profile-cover.png';

export default function ProfileScreen() {
  const { t, colors: c } = useDesign();
  const { palette: p } = useProfileChrome();
  const { set } = usePrefs();
  const { data } = auth.useSession();
  const name = data?.user.name?.trim() || t('accountMember');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = (section: AccountSection) =>
    router.push({ pathname: '/profile/[section]', params: { section } });

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await auth.signOut();
      if (result.error) throw Error();
      queryClient.clear();
      set({ locale: 'vi-VN', appearance: 'light' });
      router.replace('/');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountScroll
      fixedBackground={profileCover}
      header={
        <AccountHero
          name={name}
          owner={data?.user.id}
          open={() => open('personal')}
          payments={() => router.push('/repayments')}
          cashflow={() => router.push('/cashflow')}
        />
      }
    >
      <AccountGroups open={open} />
      <View
        style={{
          backgroundColor: p.surface,
          borderRadius: 14,
          padding: 6,
        }}
      >
        <Button
          variant="text"
          label={t('out')}
          icon={<LogOut size={17} color={c.primary} />}
          loading={busy}
          onPress={signOut}
        />
        {failed ? (
          <Text role="alert" style={{ color: c.error }}>
            {t('error')}
          </Text>
        ) : null}
      </View>
    </AccountScroll>
  );
}
