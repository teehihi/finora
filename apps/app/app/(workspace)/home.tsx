import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { Calculator, Wallet } from 'lucide-react-native';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { Logo, useWorkspaceDockInset } from '../../src/components/layout';
import { RefreshAction, TaskData } from '../../src/components/task-surface';
import { cashflowCopy, homeCopy } from '@finora/i18n';
import { firstUpcomingPayment } from '../../src/features/home-model';
import { CashflowEntry } from '../../src/features/cashflow-map';
import { PaymentHighlight } from '../../src/features/payment-highlight';
import { MarketPanel } from '../../src/features/market-ui';
import {
  HomeActivityRow,
  HomeCapacity,
  HomeFin,
  HomeSection,
  HomeTools,
  openRepayments,
  openSampleSimulator,
  openSavedSimulations,
} from '../../src/features/home-overview';

export default function Home() {
  const { t, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const copy = homeCopy(locale);
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
  const desktop = width >= 1024;
  const mobile = width < 768;
  const firstName = user?.name?.trim().split(/\s+/).at(-1);
  const refresh = (
    <RefreshAction
      busy={ledger.isFetching || saved.isFetching || account.isFetching}
      onPress={() => void Promise.all([ledger.refetch(), saved.refetch(), account.refetch()])}
    />
  );

  const payments = (
    <TaskData query={ledger} missing={cashflowCopy(locale).dataError}>
      {(value) => {
        const payment = value.overdue[0] ?? firstUpcomingPayment(value);
        if (payment)
          return (
            <PaymentHighlight
              payment={payment}
              today={value.today}
              label={payment.date < value.today ? copy.overdue : t('repaymentsNextFocus')}
              open={{
                label: vi ? 'Xem kỳ trả' : 'View payment',
                onPress: () => router.push('/repayments'),
              }}
            />
          );
        return (
          <MarketPanel
            style={{
              gap: 5,
              backgroundColor: c.secondary,
              minHeight: 169,
              justifyContent: 'center',
            }}
          >
            <Heading size={22}>
              {value.loans.length ? t('repaymentsNoAction') : t('emptyActive')}
            </Heading>
            <Text small muted>
              {t('repaymentsUntrackedNote')}
            </Text>
            <HomeActivityRow
              title={vi ? 'Mở sổ trả nợ' : 'Open repayment ledger'}
              detail={
                vi ? 'Theo dõi khoản vay đã nhận' : 'Track borrowing you have already received'
              }
              icon={Wallet}
              onPress={openRepayments}
            />
          </MarketPanel>
        );
      }}
    </TaskData>
  );

  const actions = (
    <>
      <HomeTools />
      <HomeSection
        title={vi ? 'Việc cần để ý' : 'Worth a look'}
        link={copy.repayments}
        onPress={openRepayments}
      >
        <CashflowEntry attention />
      </HomeSection>
    </>
  );

  const recent = (
    <HomeSection
      title={vi ? 'Gần đây' : 'Recent'}
      link={t('seeAll')}
      onPress={openSavedSimulations}
    >
      <TaskData query={saved} kind="rows">
        {(rows) => (
          <MarketPanel style={{ paddingVertical: 2, gap: 0 }}>
            {rows.length ? (
              rows.slice(0, 3).map((row, index) => (
                <View key={row.id} style={{ borderTopWidth: index ? 1 : 0, borderColor: c.border }}>
                  <HomeActivityRow
                    title={locale === 'vi-VN' ? row.product.name : row.product.nameEn}
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
            )}
          </MarketPanel>
        )}
      </TaskData>
    </HomeSection>
  );

  return (
    <>
      {mobile ? (
        <View
          style={{
            minHeight: 54,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            backgroundColor: c.surface,
            borderBottomWidth: 1,
            borderColor: c.border,
          }}
        >
          <Action label="Finora" onPress={() => router.replace('/home')}>
            <Logo small />
          </Action>
          {refresh}
        </View>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: width < 370 ? 16 : desktop ? 40 : 20,
          paddingTop: 13,
          paddingBottom: dockInset + 22,
        }}
      >
        <View style={{ width: '100%', maxWidth: 1120, gap: 15 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 9,
            }}
          >
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text small bold muted>
                {vi ? 'Kế hoạch của bạn' : 'Your plan'}
              </Text>
              {mobile ? (
                <Heading size={23}>
                  {firstName ? (vi ? 'Chào, ' : 'Hello, ') + firstName : t('greet')}
                </Heading>
              ) : (
                <Heading size={26}>
                  {user?.name?.trim()
                    ? t('greet') + ', ' + user.name.trim() + '.'
                    : t('greet') + '!'}
                </Heading>
              )}
            </View>
            {!mobile ? refresh : null}
          </View>
          {desktop ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 23 }}>
              <View style={{ flex: 1.2, minWidth: 0, gap: 16 }}>
                {payments}
                {actions}
                {recent}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 15 }}>
                <HomeCapacity account={account} desktop />
                <HomeFin />
              </View>
            </View>
          ) : (
            <>
              {payments}
              {actions}
              {recent}
              <HomeCapacity account={account} desktop={false} />
              <HomeFin />
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}
