import { useCYLScrollTarget } from '../../src/components/cyl-scroll-target';
import { useCallback, useRef, useState } from 'react';
import { Platform, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { dark, tokens } from '@finora/design-tokens';
import { cashflowCopy, homeCopy } from '@finora/i18n';
import {
  Calculator,
  ChartNoAxesCombined,
  ChevronRight,
  RefreshCw,
  Wallet,
} from 'lucide-react-native';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { useWorkspaceDockInset } from '../../src/components/layout';
import { TaskData } from '../../src/components/task-surface';
import { HomeBackdrop } from '../../src/features/home-backdrop';
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
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const gutter = width < 370 ? 16 : desktop ? 36 : 20;
  const firstName = user?.name?.trim().split(/\s+/).at(-1);
  const [refreshing, setRefreshing] = useState(false);
  const [backdrop, setBackdrop] = useState({ end: 260, cardTop: 158 });
  const artwork = useRef({ focusTop: 0, focusHeight: 204 });
  function updateBackdrop(measurement: Partial<typeof artwork.current>) {
    if (!mobile) return;
    artwork.current = { ...artwork.current, ...measurement };
    const { focusTop, focusHeight } = artwork.current;
    if (focusTop > 0 && focusHeight > 0) {
      const end = Math.round(focusTop + focusHeight / 2);
      const cardTop = Math.round(focusTop);
      setBackdrop((previous) =>
        previous.end === end && previous.cardTop === cardTop ? previous : { end, cardTop },
      );
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
  const refreshLabel = vi ? 'Làm mới dữ liệu' : 'Refresh data';
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {mobile && focused ? <StatusBar style="light" /> : null}
      {mobile ? (
        <HomeBackdrop
          night={c === dark}
          width={width}
          height={topInset + backdrop.end}
          cardTop={topInset + backdrop.cardTop}
          statusInset={topInset}
          surface={c.surface}
        />
      ) : null}
      <ScrollView
        {...scrollTarget}
        testID={scrollTarget?.testID ?? 'home-refresh-scroll'}
        style={{ flex: 1, backgroundColor: mobile ? 'transparent' : c.surface }}
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
          <View style={{ marginBottom: mobile ? 46 : 0 }}>
            <HomeSearch
              gutter={mobile ? gutter : 0}
              greeting={
                mobile
                  ? firstName
                    ? (vi ? 'Chào, ' : 'Hello, ') + firstName
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
          <View
            style={{
              alignItems: 'center',
              borderTopWidth: 1,
              borderColor: c.border,
              paddingTop: 4,
            }}
          >
            <Action
              label={refreshLabel}
              onPress={() => void refresh()}
              disabled={ledger.isFetching || saved.isFetching || account.isFetching}
              style={{ alignItems: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 10 }}
            >
              <RefreshCw size={15} color={c.muted} />
              <Text small muted>
                {refreshLabel}
              </Text>
            </Action>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
