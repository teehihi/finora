import { useCYLScrollTarget } from '../../src/components/cyl-scroll-target';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { dark, tokens } from '@finora/design-tokens';
import { cashflowCopy, homeCopy } from '@finora/i18n';
import { Calculator, ChartNoAxesCombined, ChevronRight, Wallet } from 'lucide-react-native';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { useWorkspaceDockInset } from '../../src/components/layout';
import { TaskData } from '../../src/components/task-surface';
import { HomeBackdrop, homePanorama } from '../../src/features/home-backdrop';
import { useHomeStatus } from '../../src/features/home-status-context';
import { homePhotoStatus, homeStatusTransition } from '../../src/features/home-status';
import { HomeSearch } from '../../src/features/home-search';
import { HomeFocus } from '../../src/features/home-focus';
import {
  HomeActivityRow,
  HomeCapacity,
  HomeFin,
  HomeSection,
  HomeTools,
  openSampleSimulator,
  openSavedSimulations,
} from '../../src/features/home-overview';

export default function Home() {
  const { t, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const scrollTarget = useCYLScrollTarget();
  const copy = homeCopy(locale);
  const cashflow = cashflowCopy(locale);
  const vi = locale === 'vi-VN';
  const dockInset = useWorkspaceDockInset();
  const user = auth.useSession().data?.user;
  const account = useAccount();
  const { ledger } = useRepaymentLedger();
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const desktop = width >= tokens.breakpoints.desktop;
  const mobile = width < tokens.breakpoints.rail;
  const insets = useSafeAreaInsets();
  const topInset = mobile ? insets.top : 0;
  const [focused, setFocused] = useState(false);
  const [cardFrame, setCardFrame] = useState({ top: 131, end: 235 });
  const backdropHeight = topInset + cardFrame.end;
  const cardTop = topInset + cardFrame.top;
  const { fadeTop } = homePanorama(width, backdropHeight, cardTop);
  const { backingStart, backingEnd, switchTone } = homeStatusTransition(
    backdropHeight,
    topInset,
    fadeTop,
  );
  const { setOverPhoto: setIOSStatusOverPhoto } = useHomeStatus();
  const [statusOverPhoto, setStatusOverPhoto] = useState(true);
  const statusOverPhotoRef = useRef(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const dockOnScroll = scrollTarget?.onScroll;
  const viewportOffset = useRef(0);
  const pendingPull = useRef<{ x: number; y: number; id: number } | null>(null);
  const onMobileScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== 'web',
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          dockOnScroll?.(event);
          viewportOffset.current = event.nativeEvent.contentOffset.y;
          if (Platform.OS !== 'web' && topInset > 0) {
            const next = homePhotoStatus(
              viewportOffset.current,
              statusOverPhotoRef.current,
              switchTone,
            );
            if (next !== statusOverPhotoRef.current) {
              statusOverPhotoRef.current = next;
              if (Platform.OS === 'ios') setIOSStatusOverPhoto(next);
              else setStatusOverPhoto(next);
            }
          }
        },
      }),
    [dockOnScroll, scrollY, setIOSStatusOverPhoto, switchTone, topInset],
  );
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (Platform.OS === 'ios') {
        const next = homePhotoStatus(
          viewportOffset.current,
          statusOverPhotoRef.current,
          switchTone,
        );
        statusOverPhotoRef.current = next;
        setIOSStatusOverPhoto(next);
      }
      return () => setFocused(false);
    }, [setIOSStatusOverPhoto, switchTone]),
  );
  const gutter = width < 370 ? 16 : desktop ? 36 : 20;
  const firstName = user?.name?.trim().split(/\s+/).at(-1);
  const [refreshing, setRefreshing] = useState(false);
  const artwork = useRef({ focusTop: 0, focusHeight: 204 });
  function updateBackdrop(measurement: Partial<typeof artwork.current>) {
    if (!mobile) return;
    artwork.current = { ...artwork.current, ...measurement };
    const { focusTop, focusHeight } = artwork.current;
    if (focusTop > 0 && focusHeight > 0) {
      const end = Math.round(focusTop + focusHeight / 2);
      const top = Math.round(focusTop);
      setCardFrame((prev) => (prev.top === top && prev.end === end ? prev : { top, end }));
    }
  }
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([ledger.refetch(), saved.refetch(), account.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };
  // Native uses RefreshControl. On touch web, the same top-only gesture
  // refreshes the app's queries instead of needing a duplicate footer button.
  const touchRefresh = mobile && Platform.OS === 'web';
  const beginWebPull = ({ nativeEvent }: GestureResponderEvent) => {
    const finger = nativeEvent.touches[0];
    pendingPull.current =
      viewportOffset.current <= 1 && nativeEvent.touches.length === 1 && finger
        ? { x: finger.pageX, y: finger.pageY, id: finger.identifier }
        : null;
  };
  const finishWebPull = ({ nativeEvent }: GestureResponderEvent) => {
    const start = pendingPull.current;
    pendingPull.current = null;
    const finger = Array.from(nativeEvent.changedTouches).find(
      (touch) => touch.identifier === start?.id,
    );
    if (!start || !finger || viewportOffset.current > 1) return;
    const distance = finger.pageY - start.y;
    if (distance >= 72 && distance > 1.4 * Math.abs(finger.pageX - start.x)) void refresh();
  };
  const tools = <HomeTools />;
  const focus = (
    <TaskData query={ledger} kind="hero" missing={cashflow.dataError}>
      {(value) => <HomeFocus ledger={value} />}
    </TaskData>
  );
  const journal = (
    <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 16, gap: 6 }}>
      <Heading size={21}>{vi ? 'Sổ cá nhân' : 'My ledger'}</Heading>
      <Action
        label={cashflow.title}
        onPress={() => router.push('/cashflow')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}
      >
        <ChartNoAxesCombined size={22} strokeWidth={1.7} color={c.primary} />
        <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
          <Text bold>{cashflow.title}</Text>
          <Text small muted>
            {cashflow.link}
          </Text>
        </View>
        <ChevronRight size={16} color={c.muted} />
      </Action>
      <HomeSection title={copy.recent} link={t('seeAll')} onPress={openSavedSimulations} secondary>
        <TaskData query={saved} kind="rows">
          {(rows) =>
            rows.length ? (
              rows.slice(0, 3).map((row, index) => (
                <View key={row.id} style={{ borderTopWidth: index ? 1 : 0, borderColor: c.border }}>
                  <HomeActivityRow
                    title={vi ? row.product.name : row.product.nameEn}
                    detail={row.input.months + ' ' + t('months')}
                    amount={row.input.principal}
                    icon={Wallet}
                    onPress={() => router.push('/saved/' + row.id)}
                  />
                </View>
              ))
            ) : (
              <HomeActivityRow
                title={t('emptySaved')}
                detail={copy.example}
                icon={Calculator}
                onPress={openSampleSimulator}
              />
            )
          }
        </TaskData>
      </HomeSection>
    </View>
  );
  const statusStyle = c === dark || statusOverPhoto ? 'light' : 'dark';
  const statusBackingOpacity = scrollY.interpolate({
    inputRange: [backingStart, backingEnd],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {mobile && focused && Platform.OS === 'android' ? <StatusBar style={statusStyle} /> : null}
      {mobile ? (
        <HomeBackdrop
          night={c === dark}
          width={width}
          height={backdropHeight}
          cardTop={cardTop}
          statusInset={topInset}
          surface={c.surface}
          scrollY={scrollY}
        />
      ) : null}
      <Animated.ScrollView
        {...scrollTarget}
        testID={scrollTarget?.testID ?? 'home-refresh-scroll'}
        onScroll={mobile ? onMobileScroll : scrollTarget?.onScroll}
        scrollEventThrottle={mobile ? 16 : scrollTarget?.scrollEventThrottle}
        style={{
          flex: 1,
          backgroundColor: mobile ? 'transparent' : c.surface,
          ...(touchRefresh ? { overscrollBehaviorY: 'contain' } : {}),
        }}
        onTouchStart={touchRefresh ? beginWebPull : undefined}
        onTouchEnd={touchRefresh ? finishWebPull : undefined}
        onTouchCancel={
          touchRefresh
            ? () => {
                pendingPull.current = null;
              }
            : undefined
        }
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              progressViewOffset={topInset}
              onRefresh={() => void refresh()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          )
        }
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: gutter,
          paddingTop: mobile ? topInset : 20,
          paddingBottom: dockInset + 24,
        }}
      >
        <View style={{ width: '100%', maxWidth: 1120, gap: desktop ? 23 : 17 }}>
          <View style={{ marginBottom: mobile ? (Platform.OS === 'ios' ? 17 : 23) : 0 }}>
            <HomeSearch
              gutter={mobile ? gutter : 0}
              animateHint={mobile && focused}
              greetingName={mobile ? firstName : undefined}
              greeting={
                mobile
                  ? firstName
                    ? vi
                      ? 'Chào, '
                      : 'Hello, '
                    : t('greet')
                  : user?.name?.trim()
                    ? t('greet') + ', ' + user.name.trim() + '.'
                    : t('greet') + '!'
              }
            />
          </View>
          <View
            onLayout={({ nativeEvent }) => updateBackdrop({ focusTop: nativeEvent.layout.y })}
            style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 44 : 24 }}
          >
            <View style={{ flex: desktop ? 1.2 : undefined, minWidth: 0, gap: desktop ? 23 : 17 }}>
              <View
                onLayout={({ nativeEvent }) =>
                  updateBackdrop({ focusHeight: nativeEvent.layout.height })
                }
              >
                {focus}
              </View>
              {tools}
              {journal}
            </View>
            <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 20 }}>
              <HomeCapacity account={account} desktop={desktop} />
              <HomeFin />
            </View>
          </View>
        </View>
      </Animated.ScrollView>
      {mobile && Platform.OS === 'ios' && topInset > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: topInset,
            backgroundColor: c.surface,
            opacity: statusBackingOpacity,
          }}
        />
      )}
    </View>
  );
}
