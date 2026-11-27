import { dark, tokens } from '@finora/design-tokens';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  Keyboard,
  PanResponder,
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, Redirect, router, useGlobalSearchParams, usePathname } from 'expo-router';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
import { ChevronRight, LockKeyhole } from 'lucide-react-native';
import { useDesign, Text, Eyebrow, Action, Avatar, ErrorState } from '@finora/ui';
import { LaunchScene } from '../../src/components/LaunchScene';
import { Logo, WorkspaceDockInsetContext } from '../../src/components/layout';
import {
  DockChrome,
  dockGlassEffect,
  dockHeight,
  dockOffset,
} from '../../src/components/DockChrome';
import { auth } from '../../src/services/client';
import { CYLScrollContext, cylScrollTarget } from '../../src/components/cyl-scroll-target';
import CYLDock, { cylDockAvailable } from '../../src/components/CYLDock';
import { date } from '@finora/i18n';
import { useReducedMotion } from '@finora/ui';
import { workspaceMotion } from '../../src/features/navigation/workspace-motion';
import { workspaceAuthReturn } from '../../src/features/auth/return-path';

import { workspaceTabs as links } from '../../src/components/workspace-tabs';
import { useHomeStatus } from '../../src/features/home-status-context';
import { FinPromptSession } from '../../src/features/intelligence/prompt-session';

function useDockPreferences() {
  const reduceMotion = useReducedMotion();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
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
  const [cylHeight, setCylHeight] = useState(83);
  const navWidthRef = useRef(0);
  const selectedIndex = useRef(0);
  const isDragging = useRef(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const path = usePathname();
  const search = useGlobalSearchParams();
  const [cylCompactPath, setCylCompactPath] = useState<string>();
  const reportCYLScroll = useCallback((route: string, compact: boolean) => {
    setCylCompactPath((current) => (compact ? route : current === route ? undefined : current));
  }, []);
  const { data, isPending, error, refetch } = auth.useSession();
  const { t, colors: c, locale } = useDesign();
  const { overPhoto: homeOverPhoto } = useHomeStatus();
  const { reduceMotion, keyboardVisible } = useDockPreferences();
  const [finSwipe, setFinSwipe] = useState<'/home' | '/explore' | '/loans' | '/profile'>();
  useEffect(() => {
    if (!finSwipe) return;
    // Let native-stack apply the exit options before replacing Fin with its peer.
    const frame = requestAnimationFrame(() => router.replace(finSwipe));
    const clear = setTimeout(() => setFinSwipe(undefined), 550);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(clear);
    };
  }, [finSwipe]);
  const rail = width >= tokens.breakpoints.rail;
  const full = width >= tokens.breakpoints.desktop;
  const inSearch = path === '/search';
  const edgeToEdge =
    !rail &&
    (path === '/home' ||
      path === '/intelligence' ||
      (path === '/assistant' && search.mode !== 'legacy'));
  const finRoot = path === '/intelligence' || (path === '/assistant' && search.mode !== 'legacy');
  const showDock = !rail && !keyboardVisible && !inSearch && !finRoot;
  const activeIndex = Math.max(
    0,
    links.findIndex(
      ([key, href]) =>
        path === href ||
        (key === 'explore' && path.startsWith('/simulate/')) ||
        (key === 'ai' &&
          (path === '/intelligence' || path === '/documents' || path.startsWith('/documents/'))) ||
        (key === 'loans' &&
          (path === '/repayments' || path === '/cashflow' || path.startsWith('/saved/'))),
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

  // RN Web's touch-history PanResponder can lose part of a mouse drag when
  // taking over from a pressed tab. Track actual pointer travel on web only.
  // Native still uses the original PanResponder and Liquid Glass indicator.
  const userId = data?.user.id;
  useEffect(() => {
    if (Platform.OS !== 'web' || !showDock || !userId) return;
    const node = dock.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) return;
    let start: { id: number; x: number; y: number; index: number; step: number } | null = null;
    let skipClick = false;
    let skipTimer: ReturnType<typeof setTimeout> | undefined;
    const previousTouch = node.style.touchAction;
    const previousSelect = node.style.userSelect;
    node.style.touchAction = 'pan-y';
    node.style.userSelect = 'none';

    const snap = (index: number, step: number) => {
      const toValue = index * step;
      if (reduceMotion) indicatorX.setValue(toValue);
      else
        Animated.timing(indicatorX, {
          toValue,
          duration: tokens.motion.navigation,
          useNativeDriver: false,
        }).start();
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      skipClick = false;
      clearTimeout(skipTimer);
      const { left, width: dockWidth } = node.getBoundingClientRect();
      const step = dockWidth / links.length;
      const index = selectedIndex.current;
      if (step <= 0 || Math.floor((event.clientX - left) / step) !== index) return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, index, step };
    };
    const move = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x;
      if (!isDragging.current) {
        const dy = event.clientY - start.y;
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          start = null;
          return;
        }
        if (Math.abs(dx) <= 8 || Math.abs(dx) <= Math.abs(dy)) return;
        isDragging.current = true;
        indicatorX.stopAnimation();
      }
      if (event.cancelable) event.preventDefault();
      const last = links.length - 1;
      indicatorX.setValue(Math.max(0, Math.min(last * start.step, start.index * start.step + dx)));
    };
    const finish = (event?: PointerEvent) => {
      const pending = start;
      if (!pending || (event && pending.id !== event.pointerId)) return;
      start = null;
      if (!isDragging.current) return;
      isDragging.current = false;
      skipClick = true;
      skipTimer = setTimeout(() => {
        skipClick = false;
      }, 400);
      const next =
        event?.type === 'pointerup'
          ? Math.max(
              0,
              Math.min(
                links.length - 1,
                Math.round(pending.index + (event.clientX - pending.x) / pending.step),
              ),
            )
          : pending.index;
      snap(next, pending.step);
      if (next !== pending.index) router.replace(links[next][1]);
    };
    const click = (event: MouseEvent) => {
      // Keyboard and assistive/programmatic activation have no pointer count.
      if (!skipClick || event.detail === 0) return;
      skipClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const blur = () => finish();
    node.addEventListener('pointerdown', down);
    node.addEventListener('click', click, true);
    window.addEventListener('pointermove', move, { capture: true, passive: false });
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', finish, true);
    window.addEventListener('blur', blur);
    return () => {
      clearTimeout(skipTimer);
      isDragging.current = false;
      node.style.touchAction = previousTouch;
      node.style.userSelect = previousSelect;
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('click', click, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', finish, true);
      window.removeEventListener('blur', blur);
    };
  }, [indicatorX, reduceMotion, showDock, userId]);

  if (isPending) return <LaunchScene checking />;
  if (error) return <ErrorState retry={() => refetch()} />;
  if (!data) {
    return (
      <Redirect
        href={{ pathname: '/auth', params: { returnTo: workspaceAuthReturn(path, search) } }}
      />
    );
  }
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
          minHeight: rail ? 48 : dockHeight,
          minWidth: 44,
          gap: full ? 11 : 2,
          paddingHorizontal: full ? 12 : 0,
          flexDirection: full ? 'row' : 'column',
          justifyContent: full ? 'flex-start' : 'center',
          backgroundColor: rail && on ? c.secondary : 'transparent',
          borderRadius: rail ? tokens.radius.control : tokens.radius.card,
        }}
      >
        <Icon size={rail ? 20 : 21} strokeWidth={on ? 2 : 1.65} color={labelColor} />
        <Text
          small
          bold={on}
          style={{
            fontSize: full ? 14 : rail ? 11 : 10,
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
  const showCYL = showDock && cylDockAvailable;
  const usesCYLScroll = showCYL && path !== '/assistant' && path !== '/intelligence';

  return (
    <WorkspaceDockInsetContext.Provider
      value={showCYL ? cylHeight + 5 : showDock ? dockHeight + dockOffset + 5 : 0}
    >
      <SafeAreaView
        testID="workspace-safe-area"
        edges={{
          top: edgeToEdge ? 'off' : 'additive',
          right: 'additive',
          bottom: showCYL ? 'off' : 'additive',
          left: 'additive',
        }}
        style={{
          flex: 1,
          backgroundColor: rail || inSearch ? c.surface : c.background,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <BlurTargetView
            ref={blurTarget}
            style={{
              flex: 1,
              backgroundColor: inSearch ? c.surface : c.background,
              flexDirection: rail ? 'row' : 'column',
            }}
          >
            {rail && !inSearch ? (
              <View
                style={{
                  width: full ? 222 : 88,
                  backgroundColor: c.surface,
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
              {rail && !inSearch ? (
                <View
                  style={{
                    paddingHorizontal: full
                      ? tokens.layout.desktopGutter
                      : tokens.layout.tabletGutter,
                    minHeight: 66,
                    backgroundColor: c.surface,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
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
              ) : null}
              <FinPromptSession key={data.user.id} path={path} onSwipeReturn={setFinSwipe}>
                <CYLScrollContext.Provider value={usesCYLScroll ? reportCYLScroll : undefined}>
                  <Stack
                    screenOptions={({ route }) => ({
                      headerShown: false,
                      ...workspaceMotion(
                        route.name,
                        reduceMotion,
                        Platform.OS,
                        Boolean(
                          finSwipe &&
                          (route.name === 'assistant' ||
                            route.name === 'intelligence' ||
                            '/' + route.name === finSwipe),
                        ),
                      ),
                      // Fin is a peer tab; its left-edge action returns to the
                      // last peer instead of popping an unrelated stack screen.
                      ...(Platform.OS === 'ios' &&
                      !rail &&
                      finRoot &&
                      (route.name === 'assistant' || route.name === 'intelligence')
                        ? { gestureEnabled: false }
                        : {}),
                      statusBarStyle:
                        Platform.OS === 'ios'
                          ? (route.name === 'home' && !rail && homeOverPhoto) || c === dark
                            ? 'light'
                            : 'dark'
                          : undefined,
                      // Home paints its own full-bleed image behind the system icons.
                      scrollEdgeEffects:
                        Platform.OS === 'ios' && route.name === 'home' && !rail
                          ? { top: 'hidden' }
                          : undefined,
                      contentStyle: {
                        backgroundColor: route.name === 'search' ? c.surface : c.background,
                      },
                    })}
                  />
                </CYLScrollContext.Provider>
              </FinPromptSession>
            </View>
          </BlurTargetView>
          {showCYL ? (
            <CYLDock
              height={cylHeight}
              routeKey={path}
              scrollTarget={usesCYLScroll ? cylScrollTarget(path) : undefined}
              compact={usesCYLScroll && cylCompactPath === path}
              dark={c === dark}
              primaryColor={c.primary}
              selectedIndex={activeIndex}
              titles={links.map(([key]) => t(key))}
              onHeight={setCylHeight}
              onSelect={(index, identifier) => {
                const entry = links[index];
                if (entry && entry[0] === identifier && path !== entry[1]) router.replace(entry[1]);
              }}
            />
          ) : showDock ? (
            <View
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: dockOffset,
                minHeight: dockHeight,
                paddingHorizontal: 5,
              }}
            >
              <DockChrome isDark={c === dark} nativeGlass={nativeGlass} blurTarget={blurTarget} />
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
                {...(Platform.OS === 'web' ? {} : navPan.panHandlers)}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: dockHeight }}
              >
                {navWidth > 0 ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 5,
                      bottom: 5,
                      width: navWidth / links.length,
                      transform: [{ translateX: indicatorX }],
                    }}
                  >
                    {nativeGlass ? (
                      <LiquidGlassView
                        effect={dockGlassEffect}
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
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </WorkspaceDockInsetContext.Provider>
  );
}
