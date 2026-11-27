import { useCYLScrollTarget } from '../../src/components/cyl-scroll-target';
import { useState } from 'react';
import { Platform, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { tokens } from '@finora/design-tokens';
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
  const firstName = user?.name?.trim().split(/\s+/).at(-1);
  const [refreshing, setRefreshing] = useState(false);
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
    <TaskData query={ledger} missing={cashflow.dataError}>
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
    <ScrollView
      {...scrollTarget}
      style={{ flex: 1, backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        Platform.OS === 'web' ? undefined : (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        )
      }
      contentContainerStyle={{
        alignItems: 'center',
        paddingHorizontal: width < 370 ? 16 : desktop ? 36 : 20,
        paddingTop: mobile ? 21 : 28,
        paddingBottom: dockInset + 24,
      }}
    >
      <View style={{ width: '100%', maxWidth: 1120, gap: desktop ? 23 : 17 }}>
        <Heading size={mobile ? 29 : 31}>
          {mobile
            ? firstName
              ? (vi ? 'Chào, ' : 'Hello, ') + firstName
              : t('greet')
            : user?.name?.trim()
              ? t('greet') + ', ' + user.name.trim() + '.'
              : t('greet') + '!'}
        </Heading>
        <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 44 : 24 }}>
          <View style={{ flex: desktop ? 1.2 : undefined, minWidth: 0, gap: desktop ? 23 : 17 }}>
            {focus}
            {tools}
            {journal}
          </View>
          <View style={{ flex: desktop ? 1 : undefined, minWidth: 0, gap: 20 }}>
            <HomeCapacity account={account} desktop={desktop} />
            <HomeFin />
          </View>
        </View>
        <View
          style={{ alignItems: 'center', borderTopWidth: 1, borderColor: c.border, paddingTop: 4 }}
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
  );
}
