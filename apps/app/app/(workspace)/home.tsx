import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Heading, useDesign } from '@finora/ui';
import { Calculator, CalendarDays, CircleAlert, Wallet } from 'lucide-react-native';
import { api, auth } from '../../src/services/client';
import { useAccount } from '../../src/providers/AppProviders';
import { useRepaymentLedger } from '../../src/features/repayments';
import { Data, useWorkspaceDockInset } from '../../src/components/layout';
import { homeCopy } from '@finora/i18n';
import { firstUpcomingPayment } from '../../src/features/home-model';
import {
  HomeActivityRow,
  HomeCapacity,
  HomeFin,
  HomePayment,
  HomeSection,
  HomeTools,
  openRepayments,
  openSampleSimulator,
  openSavedSimulations,
} from '../../src/features/home-overview';

export default function Home() {
  const { t, colors: c, locale } = useDesign();
  const copy = homeCopy(locale);
  const { width } = useWindowDimensions();
  const dockInset = useWorkspaceDockInset();
  const user = auth.useSession().data?.user;
  const account = useAccount();
  const { ledger } = useRepaymentLedger();
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const mobile = width < 768;
  const desktop = width >= 1024;
  const name = user?.name?.trim();
  const currentLedger = ledger.data;
  const hasPendingPayment =
    !!currentLedger && (currentLedger.overdue.length > 0 || !!firstUpcomingPayment(currentLedger));

  const payments = (
    <HomeSection
      title={copy.next}
      link={copy.schedule}
      onPress={openRepayments}
      style={{ borderBottomWidth: 1, borderColor: c.border, paddingBottom: 12 }}
    >
      <Data q={ledger}>
        {(value) => {
          const payment = firstUpcomingPayment(value);
          return (
            <>
              {value.overdue.length ? (
                <HomeActivityRow
                  title={copy.overdue}
                  detail={copy.overdueDetail}
                  amount={value.overdueTotal}
                  icon={CircleAlert}
                  warning
                  onPress={openRepayments}
                />
              ) : null}
              {payment ? (
                <HomePayment payment={payment} />
              ) : value.overdue.length === 0 ? (
                <HomeActivityRow
                  title={t('upcoming')}
                  detail={value.loans.length ? t('repaymentsNoDue') : t('emptyActive')}
                  icon={CalendarDays}
                  onPress={openRepayments}
                />
              ) : null}
            </>
          );
        }}
      </Data>
    </HomeSection>
  );

  const recent = (
    <HomeSection title={copy.recent} link={t('seeAll')} onPress={openSavedSimulations}>
      <Data q={saved}>
        {(rows) =>
          rows.length ? (
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
          )
        }
      </Data>
    </HomeSection>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        alignItems: 'center',
        paddingHorizontal: mobile ? (width < 370 ? 16 : 20) : desktop ? 38 : 21,
        paddingTop: mobile ? 14 : 19,
        paddingBottom: dockInset + 20,
      }}
    >
      <View style={{ width: '100%', maxWidth: 1120, gap: mobile ? 19 : 24 }}>
        {!mobile ? (
          <Heading size={desktop ? 29 : 25}>
            {name ? t('greet') + ', ' + name + '.' : t('greet') + '!'}
          </Heading>
        ) : null}
        {desktop ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 34 }}>
            <View style={{ flex: 1.23, minWidth: 0, gap: 22 }}>
              <HomeCapacity account={account} desktop />
              <HomeFin />
              <HomeTools />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 13 }}>
              {payments}
              {recent}
            </View>
          </View>
        ) : (
          <>
            <HomeCapacity account={account} desktop={false} />
            {hasPendingPayment ? payments : null}
            <HomeFin />
            <HomeTools />
            {!hasPendingPayment ? payments : null}
            {recent}
          </>
        )}
      </View>
    </ScrollView>
  );
}
