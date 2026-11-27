import logo from '../../assets/brand/lockup.png';
import React, { createContext, useContext } from 'react';
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
import { router, type Href } from 'expo-router';
import { ArrowLeft, ArrowRight, Globe2 } from 'lucide-react-native';
import {
  Heading,
  Text,
  useDesign,
  Action,
  Button,
  LoadingState,
  ErrorState,
  Eyebrow,
} from '@finora/ui';
import { tokens } from '@finora/design-tokens';
import { usePrefs } from '../providers/AppProviders';
export function Logo({ small = false }: { small?: boolean }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.logoPlate,
        paddingHorizontal: 4,
        borderRadius: tokens.radius.small,
      }}
    >
      <Image
        source={logo}
        accessibilityLabel="Finora"
        resizeMode="contain"
        style={{ width: small ? 72 : 96, height: small ? 37 : 49 }}
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
            paddingHorizontal: width >= 768 ? tokens.layout.tabletGutter : tokens.layout.gutter,
          }}
        >
          <View style={{ width: '100%', maxWidth: tokens.breakpoints.content, flexGrow: 1 }}>
            <View
              style={{
                minHeight: auth ? (width >= 768 ? 72 : 56) : width >= 768 ? 82 : 64,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: auth ? 0 : 1,
                borderColor: c.border,
              }}
            >
              {auth ? (
                <View>
                  <Logo small={width < 768} />
                </View>
              ) : (
                <Action label="Finora" onPress={() => router.replace('/showcase')}>
                  <Logo small={width < 768} />
                </Action>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Language />
                {!auth ? (
                  <Button
                    variant="outline"
                    label={t('signIn')}
                    onPress={() => router.push('/auth')}
                  />
                ) : null}
              </View>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const WorkspaceDockInsetContext = createContext(0);
export const useWorkspaceDockInset = () => useContext(WorkspaceDockInsetContext);

// A deep link can open a detail without a stack entry. Never strand that screen.
export function backTo(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function Page({
  children,
  title,
  description,
  eyebrow,
  maxWidth = tokens.breakpoints.content,
  style,
  scrollRef,
  detail,
  showDescriptionOnPhone = true,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  eyebrow?: string;
  maxWidth?: number;
  style?: ViewStyle;
  scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>>;
  showDescriptionOnPhone?: boolean;
  detail?: { onBack: () => void; action?: React.ReactNode };
}) {
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const tablet = width >= tokens.breakpoints.rail;
  const desktop = width >= tokens.breakpoints.desktop;
  const compact = !tablet && !!detail;
  const { colors: c, t } = useDesign();
  return (
    <>
      {compact && detail ? (
        <View
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderBottomWidth: 1,
            paddingHorizontal: 12,
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <Action
            label={t('back')}
            onPress={detail.onBack}
            style={{ width: 44, height: 44, alignItems: 'center' }}
          >
            <ArrowLeft size={20} color={c.foreground} />
          </Action>
          <View style={{ flex: 1, minWidth: 0, paddingVertical: 6 }}>
            <Heading size={17} style={{ textAlign: 'center' }}>
              {title}
            </Heading>
          </View>
          <View style={{ width: 44, height: 44 }}>{detail.action}</View>
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: desktop
            ? tokens.layout.desktopGutter
            : tablet
              ? tokens.layout.tabletGutter
              : tokens.layout.gutter,
          paddingTop: tablet ? 28 : compact ? 12 : 18,
          paddingBottom: dockInset + 28,
        }}
      >
        <View style={[{ width: '100%', maxWidth, gap: tablet ? 25 : compact ? 12 : 19 }, style]}>
          {tablet && detail ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Back to={detail.onBack} />
              {detail.action}
            </View>
          ) : null}
          {!compact ? (
            <View style={{ gap: 6 }}>
              {eyebrow ? <Eyebrow tone="forest">{eyebrow}</Eyebrow> : null}
              <Heading size={desktop ? 38 : 29}>{title}</Heading>
              {description && (tablet || showDescriptionOnPhone) ? (
                <Text muted style={{ maxWidth: tokens.layout.reading }}>
                  {description}
                </Text>
              ) : null}
            </View>
          ) : description && showDescriptionOnPhone ? (
            <Text small muted>
              {description}
            </Text>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </>
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
  pendingDetail,
}: {
  pendingDetail?: { title: string; onBack: () => void };
  q: { data: T | undefined; isError: boolean; refetch: () => unknown };
  children: (v: T) => React.ReactNode;
}) {
  if (!q.isError && q.data !== undefined) return <>{children(q.data)}</>;
  const state = q.isError ? <ErrorState retry={() => q.refetch()} /> : <LoadingState />;
  return pendingDetail ? (
    <Page title={pendingDetail.title} detail={{ onBack: pendingDetail.onBack }}>
      {state}
    </Page>
  ) : (
    state
  );
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
