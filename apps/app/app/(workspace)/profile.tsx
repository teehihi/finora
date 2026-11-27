import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { profileMenuCopy } from '@finora/i18n';
import { LogOut } from 'lucide-react-native';
import { Action, Text, useDesign } from '@finora/ui';
import { AccountScroll, useProfileChrome } from '../../src/features/profile-chrome';
import {
  AccountGroups,
  AccountHero,
  type AccountDestination,
} from '../../src/features/profile-account-hub';
import { queryClient, usePrefs } from '../../src/providers/AppProviders';
import { auth } from '../../src/services/client';
import profileCover from '../../assets/brand/profile-cover.png';

export default function ProfileScreen() {
  const { t, colors: c, locale } = useDesign();
  const { palette: p } = useProfileChrome();
  const { set } = usePrefs();
  const { data } = auth.useSession();
  const name = data?.user.name?.trim() || t('accountMember');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const version = Constants.expoConfig?.version;
  const open = (section: AccountDestination) => {
    if (section === 'documents') router.push('/documents');
    else if (section === 'simulations')
      router.push({ pathname: '/loans', params: { pane: 'simulations' } });
    else router.push({ pathname: '/profile/[section]', params: { section } });
  };

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
      <View>
        <Action
          label={t('out')}
          onPress={signOut}
          disabled={busy}
          style={{
            minHeight: 60,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            alignItems: 'center',
            flexDirection: 'row',
            gap: 9,
            backgroundColor: c.error,
          }}
        >
          {busy ? <ActivityIndicator color={c.surface} /> : null}
          <Text bold style={{ color: c.surface, fontSize: 15, textAlign: 'center' }}>
            {t('out')}
          </Text>
          <LogOut size={17} color={c.surface} />
        </Action>
        {failed ? (
          <Text role="alert" style={{ color: c.error }}>
            {t('error')}
          </Text>
        ) : null}
      </View>
      {version ? (
        <Text small style={{ color: p.muted, textAlign: 'center' }}>
          {profileMenuCopy[locale].version} {version}
        </Text>
      ) : null}
    </AccountScroll>
  );
}
