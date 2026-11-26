import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Wallet,
} from 'lucide-react-native';
import { Action, Button, EmptyState, Heading, Progress, Text, useDesign } from '@finora/ui';
import type { DueRepayment, RepaymentLedger, TrackedRepayment } from '@finora/contracts';
import { date, numeric } from '@finora/i18n';
import { api, auth } from '../../src/services/client';
import { Page, Data } from '../../src/components/layout';
import { useRepaymentLedger } from '../../src/features/repayments';
import { MarketPanel, ProductIcon } from '../../src/features/market-ui';

export default function Loans() {
  const { t, colors: c, locale, money } = useDesign();
  const { width } = useWindowDimensions();
  const { ledger } = useRepaymentLedger();
  const user = auth.useSession().data?.user;
  const saved = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: api.saved,
    enabled: !!user?.id,
  });
  const desktop = width >= 1024;

  return (
    <Page title={t('loans')} description={t('loansIntro')}>
      <Data q={ledger}>{(value) => <PaymentFocus value={value} />}</Data>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 24 : 23 }}>
        {!ledger.isError && ledger.data?.loans.length ? (
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <Heading size={22}>{t('loanCenterTracked')}</Heading>
            <MarketPanel style={{ paddingHorizontal: 14, paddingVertical: 5, gap: 0 }}>
              {[...ledger.data.loans]
                .sort(
                  (a, b) =>
                    Number(a.paidPeriods === a.schedule.length) -
                    Number(b.paidPeriods === b.schedule.length),
                )
                .map((loan, i) => (
                  <TrackedRow loan={loan} first={i === 0} key={loan.id} />
                ))}
            </MarketPanel>
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Heading size={22}>{t('saved')}</Heading>
            <Text
              small
              bold
              style={{
                color: c.actionBlue,
                backgroundColor: c.actionBlueSurface,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              {t('loanCenterSimulation')}
            </Text>
          </View>
          <Text small muted>
            {t('savedOnlyNote')}
          </Text>
          <Data q={saved}>
            {(rows) =>
              rows.length ? (
                <MarketPanel style={{ paddingHorizontal: 10, paddingVertical: 4, gap: 0 }}>
                  {rows.map((r, i) => {
                    const name = locale === 'vi-VN' ? r.product.name : r.product.nameEn;
                    return (
                      <Action
                        key={r.id}
                        label={name}
                        onPress={() => router.push('/saved/' + r.id)}
                        style={{
                          minHeight: 64,
                          borderTopWidth: i ? 1 : 0,
                          borderColor: c.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 9,
                          paddingVertical: 9,
                        }}
                      >
                        <ProductIcon category={r.product.category} />
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <Text bold>{name}</Text>
                          <Text small muted>
                            {t('savedDate')} {date(r.createdAt, locale)}
                          </Text>
                        </View>
                        <View
                          style={{ flexShrink: 1, minWidth: 0, alignItems: 'flex-end', gap: 3 }}
                        >
                          <Text
                            small
                            bold
                            style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}
                          >
                            {money(r.input.principal)}
                          </Text>
                          <Text small muted>
                            {numeric(r.input.months, locale)} {t('months')}
                          </Text>
                        </View>
                        <ChevronRight size={17} color={c.muted} />
                      </Action>
                    );
                  })}
                </MarketPanel>
              ) : (
                <MarketPanel>
                  <EmptyState
                    title={t('emptySaved')}
                    body={t('emptySavedText')}
                    icon={<Calculator size={23} color={c.primary} />}
                    action={
                      <Button
                        label={t('learn')}
                        variant="outline"
                        onPress={() => router.navigate('/explore?mode=sample')}
                      />
                    }
                  />
                </MarketPanel>
              )
            }
          </Data>
        </View>
      </View>
    </Page>
  );
}

function priorityPayment(value: RepaymentLedger): DueRepayment | undefined {
  // Overdue is already sorted by the API. Beyond its 30-day window, use the
  // owned schedule so a real later payment is not mistaken for an empty ledger.
  if (value.overdue.length) return value.overdue[0];
  let next: DueRepayment | undefined;
  for (const loan of value.loans) {
    for (const row of loan.schedule) {
      if (row.paid || row.date < value.today || (next && row.date >= next.date)) continue;
      next = {
        loanId: loan.id,
        title: loan.title,
        date: row.date,
        payment: row.payment,
        period: row.period,
      };
    }
  }
  return next;
}

function PaymentFocus({ value }: { value: RepaymentLedger }) {
  const { t, colors: c, money, locale } = useDesign();
  const next = priorityPayment(value);
  const open = () => router.push('/repayments');
  const empty = !value.loans.length;
  const past = !!next && next.date < value.today;
  const heading = next
    ? t(past ? 'loanCenterPast' : 'loanCenterNext')
    : t(empty ? 'loanCenterEmpty' : 'loanCenterNoPending');

  return (
    <View style={{ gap: 9 }}>
      <View
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: c.forest,
          padding: 18,
          gap: 12,
        }}
      >
        <View
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            width: 244,
            height: 244,
            right: -95,
            top: -138,
            borderRadius: 122,
            borderWidth: 20,
            borderColor: 'rgba(217,255,222,0.09)',
          }}
        />
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 9, flexWrap: 'wrap' }}>
          <View
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.13)',
            }}
          >
            {empty ? (
              <Wallet size={20} color={c.onForest} />
            ) : next ? (
              <CalendarClock size={20} color={c.onForest} />
            ) : (
              <CircleCheck size={20} color={c.onForest} />
            )}
          </View>
          <Text bold style={{ color: past ? '#FFD6A3' : c.onForest }}>
            {heading}
          </Text>
        </View>
        {next ? (
          <View style={{ gap: 4 }}>
            <Heading size={36} style={{ color: c.onForest, fontVariant: ['tabular-nums'] }}>
              {money(next.payment)}
            </Heading>
            <Text small bold style={{ color: c.onForest }}>
              {next.title}
            </Text>
            <Text small style={{ color: c.onForestMuted }}>
              {next.date === value.today ? t('loanCenterToday') : date(next.date, locale)} ·{' '}
              {t('repaymentsPeriod').replace('{n}', numeric(next.period, locale))}
            </Text>
          </View>
        ) : (
          <Text small style={{ color: c.onForestMuted, maxWidth: 480 }}>
            {t(empty ? 'loanCenterEmptyBody' : 'loanCenterNoPendingBody')}
          </Text>
        )}
        {!empty ? (
          <Action
            label={t('repaymentsOpen')}
            onPress={open}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              minHeight: 44,
              backgroundColor: '#C5F38A',
              borderRadius: 13,
              paddingHorizontal: 13,
              paddingVertical: 7,
            }}
          >
            <Text bold style={{ color: '#10382F' }}>
              {t('repaymentsOpen')}
            </Text>
            <ArrowRight size={17} color="#10382F" />
          </Action>
        ) : null}
      </View>
      {!empty ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <PaymentTotal label={t('loanCenterThirty')} amount={value.upcomingTotal} />
            <PaymentTotal
              label={t('loanCenterPastTotal')}
              amount={value.overdueTotal}
              urgent={value.overdueTotal > 0}
            />
          </View>
          <Text small muted>
            {t('repaymentsTotalsNote')}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function PaymentTotal({
  label,
  amount,
  urgent,
}: {
  label: string;
  amount: number;
  urgent?: boolean;
}) {
  const { colors: c, money } = useDesign();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 130,
        padding: 12,
        gap: 3,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: urgent ? c.actionAmberSurface : c.surface,
        borderRadius: 15,
      }}
    >
      <Text small muted>
        {label}
      </Text>
      <Text
        bold
        style={{ color: urgent ? c.actionAmber : c.foreground, fontVariant: ['tabular-nums'] }}
      >
        {money(amount)}
      </Text>
    </View>
  );
}

function TrackedRow({ loan, first }: { loan: TrackedRepayment; first: boolean }) {
  const { colors: c, t, locale } = useDesign();
  const label = t('repaymentsProgress')
    .replace('{paid}', numeric(loan.paidPeriods, locale))
    .replace('{total}', numeric(loan.schedule.length, locale));
  return (
    <View
      style={{ paddingVertical: 12, gap: 7, borderTopWidth: first ? 0 : 1, borderColor: c.border }}
    >
      <Text bold>{loan.title}</Text>
      <Progress
        value={loan.schedule.length ? (100 * loan.paidPeriods) / loan.schedule.length : 0}
        label={label}
      />
      <Text small muted>
        {label}
      </Text>
    </View>
  );
}
