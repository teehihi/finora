import { canShowReadData } from './read-state';
import { TaskData, TaskNotice, type LoadState } from './task-surface';
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
import { Heading, Text, useDesign, Action, Button, Eyebrow } from '@finora/ui';
import { tokens } from '@finora/design-tokens';
import { usePrefs } from '../providers/AppProviders';
import { AuthBackdrop } from '../features/auth/AuthBackdrop';
import { useCYLScrollTarget } from './cyl-scroll-target';
import {
  WorkspaceBackButton,
  WorkspaceScene,
  type WorkspaceSceneIdentity,
} from './workspace-scene';
export function Logo({ small = false, auth = false }: { small?: boolean; auth?: boolean }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        alignSelf: auth ? 'center' : 'flex-start',
        backgroundColor: c.logoPlate,
        paddingHorizontal: auth ? 3 : 4,
        borderRadius: tokens.radius.small,
      }}
    >
      <Image
        source={logo}
        accessibilityLabel="Finora"
        resizeMode="contain"
        style={{
          width: auth ? 116 : small ? 72 : 96,
          height: auth ? 58 : small ? 37 : 49,
        }}
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
  authBack,
  authBrand = true,
}: {
  children: React.ReactNode;
  auth?: boolean;
  authBrand?: boolean;
  authBack?: { label: string; onPress: () => void };
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
          <View
            style={{
              width: '100%',
              maxWidth: tokens.breakpoints.content,
              flexGrow: 1,
              position: 'relative',
            }}
          >
            {auth ? <AuthBackdrop /> : null}
            {auth ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 2,
                  minHeight: width >= 768 ? 92 : 84,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {authBack ? (
                  <Action
                    label={authBack.label}
                    onPress={authBack.onPress}
                    style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
                  >
                    <ArrowLeft size={20} color={c.primary} />
                  </Action>
                ) : (
                  <View style={{ minWidth: 44, minHeight: 44 }} />
                )}
                {authBrand ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 44,
                      right: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <Logo auth />
                    <Text small muted style={{ fontSize: 12, lineHeight: 16 }}>
                      {t('authBrandSlogan')}
                    </Text>
                  </View>
                ) : null}
                <Language />
              </View>
            ) : (
              <View
                style={{
                  minHeight: width >= 768 ? 82 : 64,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Action label="Finora" onPress={() => router.replace('/showcase')}>
                  <Logo small={width < 768} />
                </Action>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Language />
                  <Button
                    variant="outline"
                    label={t('signIn')}
                    onPress={() => router.push('/auth')}
                  />
                </View>
              </View>
            )}
            <View style={{ position: 'relative', flexGrow: 1 }}>{children}</View>
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
  scene,
  header,
  contentRef,
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
  scene?: WorkspaceSceneIdentity;
  header?: React.ReactNode;
  contentRef?: React.Ref<React.ComponentRef<typeof View>>;
  detail?: { onBack: () => void; action?: React.ReactNode };
}) {
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const tablet = width >= tokens.breakpoints.rail;
  const desktop = width >= tokens.breakpoints.desktop;
  const compact = !tablet && !!detail;
  const scrollTarget = useCYLScrollTarget();
  const { colors: c, t } = useDesign();
  return (
    <>
      {compact && detail ? (
        <View
          testID="workspace-detail-chrome"
          style={{
            backgroundColor: c.elevated,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 23,
            marginHorizontal: 12,
            marginTop: 5,
            paddingHorizontal: 4,
            paddingVertical: 3,
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <WorkspaceBackButton label={t('back')} onPress={detail.onBack}>
            <ArrowLeft size={19} color={c.primary} />
          </WorkspaceBackButton>
          <View style={{ flex: 1, minWidth: 0, paddingVertical: 6 }}>
            <Heading size={17} style={{ textAlign: 'center' }}>
              {title}
            </Heading>
          </View>
          <View style={{ width: 44, height: 44 }}>{detail.action}</View>
        </View>
      ) : null}
      <ScrollView
        {...scrollTarget}
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
          paddingTop: tablet ? 26 : compact ? 12 : 13,
          paddingBottom: dockInset + 28,
        }}
      >
        <View
          ref={contentRef}
          collapsable={!contentRef}
          style={[{ width: '100%', maxWidth, gap: tablet ? 22 : compact ? 12 : 13 }, style]}
        >
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
          {header !== undefined ? (
            header
          ) : scene ? (
            <View style={{ gap: 9 }}>
              <WorkspaceScene title={title} identity={scene} desktop={desktop} />
              {description && (tablet || showDescriptionOnPhone) ? (
                <Text small muted style={{ maxWidth: tokens.layout.reading }}>
                  {description}
                </Text>
              ) : null}
            </View>
          ) : !compact ? (
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
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        paddingHorizontal: 12,
      }}
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
  q: LoadState & { data: T | undefined };
  children: (v: T) => React.ReactNode;
}) {
  if (!pendingDetail)
    return (
      <TaskData query={q} kind="rows">
        {children}
      </TaskData>
    );
  if (canShowReadData(q) && q.data !== undefined)
    return (
      <>
        <View>
          <TaskNotice query={q} stale />
        </View>
        {children(q.data)}
      </>
    );
  const state = (
    <TaskData query={q} kind="rows">
      {() => null}
    </TaskData>
  );
  return (
    <Page title={pendingDetail.title} detail={{ onBack: pendingDetail.onBack }}>
      {state}
    </Page>
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
