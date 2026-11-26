import { dark, tokens } from '@finora/design-tokens';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  PanResponder,
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, Redirect, router, usePathname } from 'expo-router';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import {
  BookOpen,
  ChevronRight,
  Compass,
  Sparkle,
  Wallet,
  UserRound,
  LockKeyhole,
} from 'lucide-react-native';
import { useDesign, Text, Eyebrow, Action, Avatar, LoadingState, ErrorState } from '@finora/ui';
import { Logo, WorkspaceDockInsetContext } from '../../src/components/layout';
import PlatformGlassSurface from '../../src/components/PlatformGlassSurface';
import { auth } from '../../src/services/client';
import { date } from '@finora/i18n';

const links = [
  ['home', '/home', BookOpen],
  ['explore', '/explore', Compass],
  ['ai', '/assistant', Sparkle],
  ['loans', '/loans', Wallet],
  ['profile', '/profile', UserRound],
] as const;

function useDockPreferences() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (!media) return;
      const read = () => setReduceMotion(media.matches);
      read();
      media.addEventListener('change', read);
      return () => media.removeEventListener('change', read);
    }
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      active = false;
      motion.remove();
      show.remove();
      hide.remove();
    };
  }, []);
  return { reduceMotion, keyboardVisible };
}

export default function Workspace() {
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const dock = useRef<ComponentRef<typeof View> | null>(null);
  const dockX = useRef(0);
  const [navWidth, setNavWidth] = useState(0);
  const navWidthRef = useRef(0);
  const selectedIndex = useRef(0);
  const isDragging = useRef(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const path = usePathname();
  const { data, isPending, error, refetch } = auth.useSession();
  const { t, colors: c, locale } = useDesign();
  const { reduceMotion, keyboardVisible } = useDockPreferences();
  const rail = width >= tokens.breakpoints.rail;
  const full = width >= tokens.breakpoints.desktop;
  const showDock = !rail && !keyboardVisible;
  const activeIndex = Math.max(
    0,
    links.findIndex(
      ([key, href]) =>
        path === href ||
        (key === 'explore' && path.startsWith('/simulate/')) ||
        (key === 'ai' &&
          (path === '/intelligence' || path === '/documents' || path.startsWith('/documents/'))) ||
        (key === 'loans' && (path === '/repayments' || path.startsWith('/saved/'))),
    ),
  );
  useEffect(() => {
    selectedIndex.current = activeIndex;
    if (isDragging.current || navWidth === 0) return;
    const toValue = (navWidth / links.length) * activeIndex;
    if (reduceMotion) {
      indicatorX.setValue(toValue);
      return;
    }
    const animation = Animated.timing(indicatorX, {
      toValue,
      duration: tokens.motion.navigation,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [activeIndex, indicatorX, navWidth, reduceMotion]);

  const navPan = useMemo(() => {
    const snap = (index: number) => {
      const toValue = (navWidthRef.current / links.length) * index;
      if (reduceMotion) indicatorX.setValue(toValue);
      else
        Animated.timing(indicatorX, {
          toValue,
          duration: tokens.motion.navigation,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (event, gesture) => {
        const itemWidth = navWidthRef.current / links.length;
        const origin = (gesture.x0 || event.nativeEvent.pageX - gesture.dx) - dockX.current;
        return (
          itemWidth > 0 &&
          Math.floor(origin / itemWidth) === selectedIndex.current &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy)
        );
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        indicatorX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        const itemWidth = navWidthRef.current / links.length;
        const x = Math.max(
          0,
          Math.min(navWidthRef.current - itemWidth, selectedIndex.current * itemWidth + gesture.dx),
        );
        indicatorX.setValue(x);
      },
      onPanResponderRelease: (_, gesture) => {
        const itemWidth = navWidthRef.current / links.length;
        const next = Math.max(
          0,
          Math.min(links.length - 1, Math.round(selectedIndex.current + gesture.dx / itemWidth)),
        );
        isDragging.current = false;
        snap(next);
        if (next !== selectedIndex.current) router.replace(links[next][1]);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        snap(selectedIndex.current);
      },
    });
  }, [indicatorX, reduceMotion]);

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState retry={() => refetch()} />;
  if (!data) return <Redirect href={{ pathname: '/auth', params: { returnTo: path } }} />;
  const name = data.user.name?.trim() || data.user.email || 'Finora';
  const selected = links[activeIndex];
  const nav = links.map(([key, href, Icon], index) => {
    const on = index === activeIndex;
    const labelColor = on ? c.primary : c.muted;
    return (
      <Action
        key={key}
        role="tab"
        selected={on}
        label={t(key)}
        onPress={() => router.replace(href)}
        style={{
          flex: rail ? undefined : 1,
          alignItems: 'center',
          minHeight: rail ? 48 : 55,
          minWidth: 44,
          gap: full ? 11 : 2,
          paddingHorizontal: full ? 12 : 0,
          flexDirection: full ? 'row' : 'column',
          justifyContent: full ? 'flex-start' : 'center',
          backgroundColor: rail && on ? c.secondary : 'transparent',
          borderRadius: rail ? tokens.radius.control : tokens.radius.card,
        }}
      >
        <Icon size={rail ? 20 : 21} strokeWidth={on ? 2 : 1.6} color={labelColor} />
        <Text
          small
          bold={on}
          style={{
            fontSize: full ? 14 : 11,
            lineHeight: full ? 21 : 16,
            color: labelColor,
            textAlign: 'center',
          }}
        >
          {t(key)}
        </Text>
        {full && on ? (
          <View
            style={{
              marginLeft: 'auto',
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: c.primary,
            }}
          />
        ) : null}
      </Action>
    );
  });
  const nativeGlass = Platform.OS === 'ios' && !!isLiquidGlassSupported;

  return (
    <WorkspaceDockInsetContext.Provider value={showDock ? tokens.layout.dockInset : 0}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <StatusBar style={c === dark ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <BlurTargetView
            ref={blurTarget}
            style={{ flex: 1, flexDirection: rail ? 'row' : 'column' }}
          >
            {rail ? (
              <View
                style={{
                  width: full ? 222 : 88,
                  backgroundColor: c.elevated,
                  paddingHorizontal: full ? 18 : 10,
                  paddingTop: 21,
                  paddingBottom: 24,
                  gap: 26,
                  borderRightWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Action
                  label="Finora"
                  onPress={() => router.replace('/home')}
                  style={{ alignSelf: full ? 'flex-start' : 'center', minWidth: 46 }}
                >
                  <Logo small={!full} />
                </Action>
                <View style={{ gap: 7 }} accessibilityRole="tablist">
                  {full ? (
                    <Eyebrow style={{ marginLeft: 12, marginBottom: 7 }}>{t('workspace')}</Eyebrow>
                  ) : null}
                  {nav}
                </View>
                <View style={{ flex: 1 }} />
                {full ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'center',
                      paddingTop: 16,
                      borderTopWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <LockKeyhole size={14} color={c.muted} />
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
                  paddingHorizontal: full
                    ? tokens.layout.desktopGutter
                    : rail
                      ? tokens.layout.tabletGutter
                      : tokens.layout.gutter,
                  minHeight: rail ? 66 : 58,
                  borderBottomWidth: 1,
                  borderColor: c.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                {rail ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 }}
                  >
                    <Text small muted>
                      Finora
                    </Text>
                    <ChevronRight size={13} color={c.muted} />
                    <Text small bold>
                      {t(path === '/intelligence' ? 'intelligenceLabel' : selected[0])}
                    </Text>
                  </View>
                ) : (
                  <Action onPress={() => router.replace('/home')} label="Finora">
                    <Logo small />
                  </Action>
                )}
                <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}>
                  {full ? (
                    <Text small muted>
                      {date(new Date(), locale)}
                    </Text>
                  ) : null}
                  <Action
                    label={t('profile')}
                    onPress={() => router.navigate('/profile')}
                    style={{ minWidth: 44, alignItems: 'center' }}
                  >
                    <Avatar name={name} />
                  </Action>
                </View>
              </View>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: reduceMotion || Platform.OS === 'web' ? 'none' : 'fade',
                  contentStyle: { backgroundColor: c.background },
                }}
              />
            </View>
          </BlurTargetView>
          {showDock ? (
            <PlatformGlassSurface
              isDark={c === dark}
              blurTarget={blurTarget}
              surfaceColor={c.surface}
              borderColor={c.border}
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 8,
                minHeight: 69,
                borderRadius: 23,
                paddingHorizontal: 4,
                paddingVertical: 5,
              }}
            >
              <View
                ref={dock}
                accessibilityRole="tablist"
                onLayout={(event) => {
                  const measured = event.nativeEvent.layout.width;
                  navWidthRef.current = measured;
                  setNavWidth(measured);
                  dock.current?.measureInWindow((x) => {
                    dockX.current = x;
                  });
                }}
                {...navPan.panHandlers}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56 }}
              >
                {navWidth > 0 ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 1,
                      bottom: 1,
                      width: navWidth / links.length,
                      transform: [{ translateX: indicatorX }],
                    }}
                  >
                    {nativeGlass ? (
                      <LiquidGlassView
                        effect="regular"
                        interactive
                        colorScheme={c === dark ? 'dark' : 'light'}
                        tintColor={
                          c === dark ? 'rgba(196, 239, 219, 0.16)' : 'rgba(220,230,215,0.44)'
                        }
                        style={{ flex: 1, marginHorizontal: 3, borderRadius: 17 }}
                      />
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          marginHorizontal: 3,
                          borderRadius: 16,
                          backgroundColor: c.secondary,
                        }}
                      />
                    )}
                  </Animated.View>
                ) : null}
                {nav}
              </View>
            </PlatformGlassSurface>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </WorkspaceDockInsetContext.Provider>
  );
}
