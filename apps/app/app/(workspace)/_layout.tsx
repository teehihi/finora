import { dark } from '@finora/design-tokens';
import { View, useWindowDimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, Redirect, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  Wallet,
  UserRound,
  ShieldCheck,
} from 'lucide-react-native';
import { useDesign, Text, Action, Avatar, Divider, LoadingState, ErrorState } from '@finora/ui';
import { Logo } from '../../src/components/layout';
import { auth } from '../../src/services/client';
import { date } from '@finora/i18n';
const links = [
  ['home', '/home', LayoutDashboard],
  ['explore', '/explore', Compass],
  ['ai', '/assistant', Sparkles],
  ['loans', '/loans', Wallet],
  ['profile', '/profile', UserRound],
] as const;
export default function Workspace() {
  const { width } = useWindowDimensions();
  const path = usePathname();
  const { data, isPending, error, refetch } = auth.useSession();
  const { t, colors: c, locale } = useDesign();
  const rail = width >= 768,
    full = width >= 1024;
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState retry={() => refetch()} />;
  if (!data) return <Redirect href="/auth" />;
  const nav = links.map(([key, href, Icon]) => {
    const on =
      path === href ||
      (key === 'explore' && path.startsWith('/simulate')) ||
      (key === 'loans' && path.startsWith('/saved'));
    const ai = key === 'ai';
    return (
      <Action
        key={key}
        role="tab"
        selected={on}
        label={t(key)}
        onPress={() => router.navigate(href)}
        style={{
          flex: rail ? undefined : 1,
          alignItems: 'center',
          minHeight: 50,
          gap: rail ? 12 : 2,
          paddingHorizontal: rail ? 10 : 0,
          flexDirection: full ? 'row' : 'column',
          justifyContent: full ? 'flex-start' : 'center',
          backgroundColor: on ? c.secondary : 'transparent',
          borderRadius: 12,
        }}
      >
        <View style={ai ? { backgroundColor: c.primary, borderRadius: 10, padding: 4 } : undefined}>
          <Icon size={ai ? 18 : 21} color={ai ? c.onPrimary : on ? c.primary : c.muted} />
        </View>
        {full || !rail ? (
          <Text
            small
            bold={on}
            style={{
              fontSize: rail ? 15 : 11,
              lineHeight: rail ? 22 : 16,
              color: on ? c.primary : c.muted,
              textAlign: 'center',
            }}
          >
            {t(key)}
          </Text>
        ) : null}
      </Action>
    );
  });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style={c === dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, flexDirection: rail ? 'row' : 'column' }}
      >
        {rail ? (
          <View
            style={{
              width: full ? 214 : 84,
              backgroundColor: c.surface,
              paddingHorizontal: full ? 16 : 6,
              paddingVertical: 22,
              gap: 20,
              borderRightWidth: 1,
              borderColor: c.border,
            }}
          >
            <Logo small={!full} />
            <Divider />
            <View style={{ gap: 6 }}>{nav}</View>
            <View style={{ flex: 1 }} />
            {full ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <ShieldCheck size={16} color={c.muted} />
                <Text small muted>
                  {t('privacyStatus')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              paddingHorizontal: rail ? 32 : 18,
              height: rail ? 68 : 56,
              borderBottomWidth: 1,
              borderColor: c.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {rail ? <Text muted>{t('workspace')}</Text> : <Logo small />}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {full ? (
                <Text small muted>
                  {date(new Date(), locale)}
                </Text>
              ) : null}
              <Action label={t('profile')} onPress={() => router.navigate('/profile')}>
                <Avatar name={data.user.name} />
              </Action>
            </View>
          </View>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: c.background },
            }}
          />
        </View>
        {!rail ? (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.surface,
              borderTopWidth: 1,
              borderColor: c.border,
              paddingVertical: 4,
              paddingHorizontal: 4,
            }}
          >
            {nav}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
