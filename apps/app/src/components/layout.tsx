import logo from '../../assets/brand/lockup.png';
import React from 'react';
import {
  Image,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Globe2 } from 'lucide-react-native';
import { Heading, Text, useDesign, Action, Button, LoadingState, ErrorState } from '@finora/ui';
import { usePrefs } from '../providers/AppProviders';
export function Logo({ small = false }: { small?: boolean }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.logoPlate,
        padding: 3,
        borderRadius: 8,
      }}
    >
      <Image
        source={logo}
        accessibilityLabel="Finora"
        resizeMode="contain"
        style={{ width: small ? 66 : 94, height: small ? 34 : 48 }}
      />
    </View>
  );
}
export function Language() {
  const { locale, set, appearance } = usePrefs();
  const { colors: c } = useDesign();
  return (
    <Action
      label={locale === 'vi-VN' ? 'English' : 'Tiếng Việt'}
      onPress={() => set({ appearance, locale: locale === 'vi-VN' ? 'en-US' : 'vi-VN' })}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10 }}
    >
      <Globe2 size={17} color={c.primary} />
      <Text small bold>
        {locale === 'vi-VN' ? 'EN' : 'VI'}
      </Text>
    </Action>
  );
}
export function PublicPage({
  children,
  auth = false,
}: {
  children: React.ReactNode;
  auth?: boolean;
}) {
  const { colors: c, t } = useDesign();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            alignItems: 'center',
            flexGrow: 1,
            paddingHorizontal: width >= 768 ? 40 : 20,
          }}
        >
          <View style={{ width: '100%', maxWidth: 1240, flexGrow: 1 }}>
            <View
              style={{
                minHeight: width >= 768 ? 92 : 70,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <Action label="Finora" onPress={() => router.replace('/')}>
                <Logo small={width < 768} />
              </Action>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Language />
                {auth ? (
                  <Action label={t('back')} onPress={() => router.replace('/')}>
                    <ArrowLeft size={22} color={c.primary} />
                  </Action>
                ) : (
                  <Button
                    variant="outline"
                    label={t('signIn')}
                    onPress={() => router.push('/auth')}
                  />
                )}
              </View>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Page({
  children,
  title,
  description,
  top,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  top?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        alignItems: 'center',
        paddingHorizontal: width >= 1024 ? 36 : 18,
        paddingTop: width >= 768 ? 32 : 20,
        paddingBottom: 40,
      }}
    >
      <View style={{ width: '100%', maxWidth: 1200, gap: 22 }}>
        {top}
        <View style={{ gap: 6 }}>
          <Heading size={width >= 1024 ? 42 : 32}>{title}</Heading>
          {description ? <Text muted>{description}</Text> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}
export function Back({ to }: { to: () => void }) {
  const { colors: c, t } = useDesign();
  return (
    <Action
      label={t('back')}
      onPress={to}
      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <ArrowLeft size={17} color={c.muted} />
      <Text small muted>
        {t('back')}
      </Text>
    </Action>
  );
}
export function LinkRow({
  title,
  body,
  icon,
  onPress,
}: {
  title: string;
  body?: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      label={title}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 8,
        justifyContent: 'flex-start',
      }}
    >
      <View style={{ padding: 10, borderRadius: 12, backgroundColor: c.secondary }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text bold>{title}</Text>
        {body ? (
          <Text small muted>
            {body}
          </Text>
        ) : null}
      </View>
      <ArrowRight size={18} color={c.primary} />
    </Action>
  );
}
export function Data<T>({
  q,
  children,
}: {
  q: { data: T | undefined; isError: boolean; refetch: () => unknown };
  children: (v: T) => React.ReactNode;
}) {
  if (q.isError) return <ErrorState retry={() => q.refetch()} />;
  if (q.data === undefined) return <LoadingState />;
  return <>{children(q.data)}</>;
}
export function Columns({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { width } = useWindowDimensions();
  return (
    <View
      style={[
        { flexDirection: width >= 1024 ? 'row' : 'column', gap: 20, alignItems: 'stretch' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
