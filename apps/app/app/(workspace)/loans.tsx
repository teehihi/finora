import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  FileText,
} from 'lucide-react-native';
import { Action, Button, EmptyState, Heading, Progress, Text, useDesign } from '@finora/ui';
import type { RepaymentLedger, TrackedPayment, TrackedRepayment } from '@finora/contracts';
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
  const [pane, setPane] = useState<'schedule' | 'simulations'>('schedule');

  return (
    <Page title={t('loans')}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          padding: 4,
          gap: 4,
          borderRadius: 16,
          backgroundColor: c.secondary,
        }}
      >
        {(
          [
            ['schedule', t('loanCenterScheduleTab'), CalendarDays],
            ['simulations', t('loanCenterPlansTab'), FileText],
          ] as const
        ).map(([key, label, Icon]) => (
          <Action
            key={key}
            label={label}
            role="tab"
            selected={pane === key}
            onPress={() => setPane(key)}
            style={{
              flex: 1,
              minHeight: 45,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              paddingHorizontal: 7,
              gap: 6,
              borderRadius: 12,
              backgroundColor: pane === key ? c.surface : 'transparent',
            }}
          >
            <Icon size={16} color={pane === key ? c.primary : c.muted} />
            <Text small bold style={{ color: pane === key ? c.foreground : c.muted }}>
              {label}
            </Text>
          </Action>
        ))}
      </View>
      {pane === 'schedule' ? (
        <Data q={ledger}>
          {(value) => (
            <PaymentFocus value={value} desktop={desktop} onPlans={() => setPane('simulations')} />
          )}
        </Data>
      ) : (
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
      )}
    </Page>
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

type Scheduled = TrackedPayment & { loanId: string; title: string };
const dayParts = (day: string, locale: 'vi-VN' | 'en-US') => {
  const value = new Date(day + 'T12:00:00Z');
  return {
    day: day.slice(8),
    month:
      locale === 'vi-VN'
        ? 'Thg ' + Number(day.slice(5, 7))
        : new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(value),
  };
};

function PaymentFocus({
  value,
  desktop,
  onPlans,
}: {
  value: RepaymentLedger;
  desktop: boolean;
  onPlans: () => void;
}) {
  const { t, colors: c, money, locale } = useDesign();
  const [selection, choose] = useState<string>();
  const rows = new Map<string, Scheduled[]>();
  for (const loan of value.loans) {
    for (const row of loan.schedule) {
      if (row.paid) continue;
      const bucket = rows.get(row.date) ?? [];
      bucket.push({ ...row, loanId: loan.id, title: loan.title });
      rows.set(row.date, bucket);
    }
  }
  const available = [...rows.keys()].sort();
  const nextDates = available.filter((d) => d >= value.today);
  const overdueDate = available.find((d) => d < value.today);
  const inWindow = nextDates.filter((d) => d <= value.through);
  const dates = [
    ...(overdueDate ? [overdueDate] : []),
    ...(inWindow.length ? inWindow : nextDates.slice(0, 1)),
  ];
  const day = (selection && dates.includes(selection) ? selection : dates[0]) ?? undefined;
  const items = day ? (rows.get(day) ?? []) : [];
  const total = items.reduce((sum, row) => sum + row.payment, 0);
  const principal = items.reduce((sum, row) => sum + row.principal, 0);
  const interest = items.reduce((sum, row) => sum + row.interest, 0);
  const past = !!day && day < value.today;
  const empty = !value.loans.length;
  const open = () => router.push('/repayments');
  const notch = {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.background,
    top: -8,
  } as const;
  return (
    <View style={{ flexDirection: desktop && !empty ? 'row' : 'column', gap: 19 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 13 }}>
        {!day ? (
          <MarketPanel>
            <EmptyState
              title={t(empty ? 'loanCenterEmpty' : 'loanCenterNoPending')}
              body={t(empty ? 'loanCenterEmptyBody' : 'loanCenterNoPendingBody')}
              icon={
                empty ? (
                  <CalendarDays size={24} color={c.primary} />
                ) : (
                  <CircleCheck size={24} color={c.primary} />
                )
              }
              action={
                <Button
                  variant="outline"
                  label={t(empty ? 'loanCenterPlansTab' : 'repaymentsOpen')}
                  onPress={empty ? onPlans : open}
                />
              }
            />
          </MarketPanel>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 4,
              }}
            >
              <Heading size={23}>{t('loanCenterTimeline')}</Heading>
              <Text small muted>
                {t('loanCenterPickDate')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7, padding: 2 }}
              keyboardShouldPersistTaps="handled"
            >
              {dates.map((d) => {
                const parts = dayParts(d, locale);
                const isPast = d < value.today;
                const label = d === value.today ? t('loanCenterToday') : date(d, locale);
                return (
                  <Action
                    key={d}
                    label={label}
                    role="radio"
                    selected={d === day}
                    onPress={() => choose(d)}
                    style={{
                      minWidth: 58,
                      minHeight: 63,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: d === day ? c.forest : c.border,
                      backgroundColor:
                        d === day ? c.forest : isPast ? c.actionAmberSurface : c.surface,
                    }}
                  >
                    <Text
                      bold
                      style={{
                        fontSize: 21,
                        lineHeight: 25,
                        fontVariant: ['tabular-nums'],
                        color: d === day ? c.onForest : c.foreground,
                      }}
                    >
                      {parts.day}
                    </Text>
                    <Text
                      small
                      style={{
                        color: d === day ? c.onForestMuted : isPast ? c.actionAmber : c.muted,
                      }}
                    >
                      {parts.month}
                    </Text>
                  </Action>
                );
              })}
            </ScrollView>
            <View
              style={{
                borderRadius: 23,
                backgroundColor: c.surface,
                borderColor: c.border,
                borderWidth: 1,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 17,
                  paddingVertical: 15,
                  gap: 5,
                  backgroundColor: past ? c.actionAmberSurface : c.secondary,
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                }}
              >
                <Text small bold style={{ color: past ? c.actionAmber : c.primary }}>
                  {t(
                    past
                      ? 'loanCenterPast'
                      : day === dates[0]
                        ? 'loanCenterNext'
                        : 'loanCenterSelected',
                  )}
                </Text>
                <Heading size={35} style={{ fontVariant: ['tabular-nums'] }}>
                  {money(total)}
                </Heading>
                <Text small bold>
                  {day === value.today ? t('loanCenterToday') : date(day, locale)}
                </Text>
              </View>
              <View
                style={{
                  position: 'relative',
                  borderTopWidth: 1,
                  borderColor: c.border,
                  borderStyle: 'dashed',
                  padding: 17,
                  gap: 12,
                }}
              >
                <View pointerEvents="none" style={{ ...notch, left: -9 }} />
                <View pointerEvents="none" style={{ ...notch, right: -9 }} />
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      height: 7,
                      gap: principal > 0 && interest > 0 ? 3 : 0,
                    }}
                    accessible={false}
                  >
                    {principal > 0 ? (
                      <View
                        style={{
                          flex: principal / (principal + interest),
                          backgroundColor: c.chartPrincipal,
                          borderRadius: 5,
                        }}
                      />
                    ) : null}
                    {interest > 0 ? (
                      <View
                        style={{
                          flex: interest / (principal + interest),
                          backgroundColor: c.actionAmber,
                          borderRadius: 5,
                        }}
                      />
                    ) : null}
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <AmountKey label={t('principal')} amount={principal} dot={c.chartPrincipal} />
                    <AmountKey label={t('interest')} amount={interest} dot={c.actionAmber} />
                  </View>
                </View>
                {items.map((row) => (
                  <View
                    key={row.loanId + ':' + row.period}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      borderTopWidth: 1,
                      borderColor: c.border,
                      paddingTop: 8,
                      gap: 9,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text small bold>
                        {row.title}
                      </Text>
                      <Text small muted>
                        {t('repaymentsPeriod').replace('{n}', numeric(row.period, locale))}
                      </Text>
                    </View>
                    {items.length > 1 ? (
                      <Text
                        small
                        bold
                        style={{ fontVariant: ['tabular-nums'], textAlign: 'right' }}
                      >
                        {money(row.payment)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
        {value.loans.length ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text small bold>
                {t('loanCenterThirty')}: {money(value.upcomingTotal)}
              </Text>
              {value.overdueTotal > 0 ? (
                <Text small bold style={{ color: c.actionAmber }}>
                  {t('loanCenterPastTotal')}: {money(value.overdueTotal)}
                </Text>
              ) : null}
            </View>
            <Text small muted>
              {t('repaymentsTotalsNote')}
            </Text>
            {day ? (
              <Button
                label={t('repaymentsOpen')}
                icon={<ArrowRight size={17} color={c.onPrimary} />}
                onPress={open}
              />
            ) : null}
          </>
        ) : null}
      </View>
      {!empty ? (
        <View style={{ flex: desktop ? 0.76 : undefined, minWidth: 0, gap: 9 }}>
          <Heading size={22}>{t('loanCenterTracked')}</Heading>
          <MarketPanel style={{ paddingHorizontal: 14, paddingVertical: 5, gap: 0 }}>
            {[...value.loans]
              .sort(
                (a, b) =>
                  Number(a.paidPeriods === a.schedule.length) -
                  Number(b.paidPeriods === b.schedule.length),
              )
              .map((loan, index) => (
                <TrackedRow key={loan.id} loan={loan} first={index === 0} />
              ))}
          </MarketPanel>
        </View>
      ) : null}
    </View>
  );
}

function AmountKey({ label, amount, dot }: { label: string; amount: number; dot: string }) {
  const { money } = useDesign();
  return (
    <View style={{ minWidth: 100, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ backgroundColor: dot, width: 7, height: 7, borderRadius: 4 }} />
        <Text small muted>
          {label}
        </Text>
      </View>
      <Text small bold style={{ fontVariant: ['tabular-nums'] }}>
        {money(amount)}
      </Text>
    </View>
  );
}
