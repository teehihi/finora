import { dark } from '@finora/design-tokens';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  PanResponder,
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, Redirect, router, usePathname } from 'expo-router';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
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
import PlatformGlassSurface from '../../src/components/PlatformGlassSurface';
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
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const [navWidth, setNavWidth] = useState(0);
  const navWidthRef = useRef(0);
  const selectedIndex = useRef(0);
  const isDragging = useRef(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const path = usePathname();
  const { data, isPending, error, refetch } = auth.useSession();
  const { t, colors: c, locale } = useDesign();
  const rail = width >= 768,
    full = width >= 1024;
  const activeIndex = Math.max(
    0,
    links.findIndex(
      ([key, href]) =>
        path === href ||
        (key === 'explore' && path.startsWith('/simulate')) ||
        (key === 'loans' && path.startsWith('/saved')),
    ),
  );
  selectedIndex.current = activeIndex;
  useEffect(() => {
    if (isDragging.current || navWidth === 0) return;
    Animated.spring(indicatorX, {
      toValue: (navWidth / links.length) * activeIndex,
      damping: 20,
      stiffness: 240,
      mass: 0.72,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorX, navWidth]);
  const navPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gesture) => {
          const itemWidth = navWidthRef.current / links.length;
          const startedOnActiveItem =
            itemWidth > 0 &&
            Math.floor(event.nativeEvent.locationX / itemWidth) === selectedIndex.current;
          return (
            startedOnActiveItem &&
            Math.abs(gesture.dx) > 7 &&
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
            Math.min(
              navWidthRef.current - itemWidth,
              selectedIndex.current * itemWidth + gesture.dx,
            ),
          );
          indicatorX.setValue(x);
        },
        onPanResponderRelease: (_, gesture) => {
          const itemWidth = navWidthRef.current / links.length;
          const next = Math.max(
            0,
            Math.min(
              links.length - 1,
              Math.round((selectedIndex.current * itemWidth + gesture.dx) / itemWidth),
            ),
          );
          isDragging.current = false;
          router.replace(links[next][1]);
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          router.replace(links[selectedIndex.current][1]);
        },
      }),
    [indicatorX],
  );
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
        onPress={() => router.replace(href)}
        style={{
          flex: rail ? undefined : 1,
          alignItems: 'center',
          minHeight: 50,
          gap: rail ? 12 : 2,
          paddingHorizontal: rail ? 10 : 0,
          flexDirection: full ? 'row' : 'column',
          justifyContent: full ? 'flex-start' : 'center',
          backgroundColor: 'transparent',
          borderRadius: 18,
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
        style={{ flex: 1 }}
      >
        <BlurTargetView
          ref={blurTarget}
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
        </BlurTargetView>
        {!rail ? (
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
              minHeight: 72,
              borderRadius: 26,
              paddingHorizontal: 4,
              paddingVertical: 5,
            }}
          >
            <View
              onLayout={(event) => {
                const measured = event.nativeEvent.layout.width;
                navWidthRef.current = measured;
                setNavWidth(measured);
              }}
              {...navPan.panHandlers}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 60 }}
            >
              {navWidth > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 3,
                    bottom: 3,
                    width: navWidth / links.length,
                    transform: [{ translateX: indicatorX }],
                  }}
                >
                  <LiquidGlassView
                    effect="regular"
                    interactive
                    colorScheme={c === dark ? 'dark' : 'light'}
                    tintColor={c === dark ? 'rgba(196, 239, 219, 0.16)' : 'rgba(255,255,255,0.36)'}
                    style={{
                      flex: 1,
                      marginHorizontal: 3,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: c === dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.68)',
                    }}
                  />
                </Animated.View>
              ) : null}
              {nav}
            </View>
          </PlatformGlassSurface>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
