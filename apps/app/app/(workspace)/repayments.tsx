import { useState } from 'react';
import { AccessibilityInfo, Platform, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CircleCheck,
} from 'lucide-react-native';
import { Action, Button, Dialog, EmptyState, Heading, Progress, Text, useDesign } from '@finora/ui';
import { tokens } from '@finora/design-tokens';
import { date, numeric } from '@finora/i18n';
import type { DueRepayment, TrackedPayment, TrackedRepayment } from '@finora/contracts';
import { backTo, Page } from '../../src/components/layout';
import { RefreshAction, TaskData } from '../../src/components/task-surface';
import { PaymentHighlight } from '../../src/features/payment-highlight';
import { ledgerKey, useRepaymentLedger } from '../../src/features/repayments';
import { firstUpcomingPayment } from '../../src/features/home-model';
import { api } from '../../src/services/client';

type RowSelection = { loanId: string; title: string; payment: TrackedPayment };

export default function Repayments() {
  const { t, money, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const { ledger, userId } = useRepaymentLedger();
  const qc = useQueryClient();
  const compact = width < tokens.breakpoints.rail;
  const back = () => backTo('/loans');
  const refresh = <RefreshAction busy={ledger.isFetching} onPress={() => void ledger.refetch()} />;
  const [selection, setSelection] = useState<RowSelection | null>(null);
  const [resultNotice, setResultNotice] = useState('');
  const save = useMutation({
    mutationFn: (next: RowSelection) =>
      api.setRepaymentPaid(next.loanId, next.payment.period, {
        paid: !next.payment.paid,
        confirmed: true,
      }),
    onSuccess: async (_result, row) => {
      await qc.invalidateQueries({ queryKey: ledgerKey(userId) });
      const message = t(row.payment.paid ? 'repaymentsUndoNotice' : 'repaymentsSavedNotice');
      setResultNotice(message);
      if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
      setSelection(null);
    },
  });

  return (
    <Page
      title={compact ? (locale === 'vi-VN' ? 'Kỳ trả góp' : 'Repayment') : t('repaymentsTitle')}
      detail={{ onBack: back, action: refresh }}
      description={t('repaymentsIntro')}
      showDescriptionOnPhone={false}
    >
      <TaskData query={ledger}>
        {(value) => {
          const selectDue = ({ loanId, period }: DueRepayment) => {
            const loan = value.loans.find((item) => item.id === loanId);
            const payment = loan?.schedule.find((item) => item.period === period && !item.paid);
            if (!loan || !payment) return;
            save.reset();
            setResultNotice('');
            setSelection({ loanId, title: loan.title, payment });
          };
          const upcoming = firstUpcomingPayment(value);
          const urgent = value.overdue[0];
          const focus = urgent ?? upcoming;
          const paid = value.loans.reduce((sum, loan) => sum + loan.paidPeriods, 0);
          const total = value.loans.reduce((sum, loan) => sum + loan.schedule.length, 0);
          const remaining = value.loans.reduce((sum, loan) => sum + loan.remainingRepayment, 0);
          return value.loans.length ? (
            <>
              {focus ? (
                <>
                  <PaymentHighlight
                    payment={focus}
                    today={value.today}
                    label={t(urgent ? 'repaymentsLate' : 'repaymentsNextFocus')}
                  >
                    <Text small muted>
                      {t('repaymentsPeriod').replace('{n}', numeric(focus.period, locale))}
                    </Text>
                  </PaymentHighlight>
                  <View
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: c.border,
                      padding: 15,
                      gap: 8,
                    }}
                  >
                    <Heading size={19}>
                      {locale === 'vi-VN' ? 'Chi tiết kỳ trả' : 'Payment breakdown'}
                    </Heading>
                    {(() => {
                      const row = value.loans
                        .find(({ id }) => id === focus.loanId)
                        ?.schedule.find(({ period }) => period === focus.period);
                      return row
                        ? (
                            [
                              ['principal', row.principal],
                              ['interest', row.interest],
                            ] as const
                          ).map(([key, amount]) => (
                            <View
                              key={key}
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                gap: 8,
                                borderTopWidth: 1,
                                borderColor: c.border,
                                paddingTop: 7,
                              }}
                            >
                              <Text small muted>
                                {t(key)}
                              </Text>
                              <Text small bold>
                                {money(amount)}
                              </Text>
                            </View>
                          ))
                        : null;
                    })()}
                    <Button
                      variant="outline"
                      label={t('repaymentsReviewFocus')}
                      onPress={() => selectDue(focus)}
                    />
                    <Text small muted>
                      {t('repaymentsManualNotice')}
                    </Text>
                  </View>
                  <Button
                    label={locale === 'vi-VN' ? 'Xem cách chuẩn bị' : 'Plan for this payment'}
                    onPress={() => router.push('/cashflow')}
                  />
                </>
              ) : (
                <View
                  style={{ backgroundColor: c.secondary, borderRadius: 22, gap: 7, padding: 18 }}
                >
                  <CircleCheck size={23} color={c.primary} />
                  <Heading size={21}>{t('repaymentsDone')}</Heading>
                  <Text small muted>
                    {t('repaymentsNoAction')}
                  </Text>
                </View>
              )}
              {compact ? (
                <Text small muted>
                  {t('repaymentsIntro')}
                </Text>
              ) : null}
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 15,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                    justifyContent: 'space-between',
                  }}
                >
                  <Text small muted>
                    {t('repaymentsRemainingTotal')}
                  </Text>
                  <Text bold style={{ fontVariant: ['tabular-nums'] }}>
                    {money(remaining)}
                  </Text>
                </View>
                <Progress
                  value={total ? (100 * paid) / total : 0}
                  label={t('repaymentsProgress')
                    .replace('{paid}', numeric(paid, locale))
                    .replace('{total}', numeric(total, locale))}
                />
                <Text small muted>
                  {t('repaymentsTotalsNote')}
                </Text>
              </View>
              <View style={{ flexDirection: width >= 1024 ? 'row' : 'column', gap: 14 }}>
                <DuePanel
                  heading={t('repaymentsDueNext')}
                  items={value.upcoming}
                  total={value.upcomingTotal}
                  range={date(value.today, locale) + ' – ' + date(value.through, locale)}
                  onSelect={selectDue}
                />
                <DuePanel
                  heading={t('repaymentsLate')}
                  items={value.overdue}
                  total={value.overdueTotal}
                  onSelect={selectDue}
                  overdue
                />
              </View>
              <Heading size={23}>{t('repaymentsTrackedLoans')}</Heading>
              {resultNotice ? (
                <View accessibilityLiveRegion="polite" role="status">
                  <Text small style={{ color: c.success }}>
                    {resultNotice}
                  </Text>
                </View>
              ) : null}
              {value.loans.map((loan) => (
                <LoanArticle
                  key={loan.id}
                  loan={loan}
                  today={value.today}
                  onSelect={(payment) => {
                    save.reset();
                    setResultNotice('');
                    setSelection({ loanId: loan.id, title: loan.title, payment });
                  }}
                />
              ))}
            </>
          ) : (
            <View style={{ backgroundColor: c.surface, borderRadius: 24, padding: 20 }}>
              <EmptyState
                title={t('emptyActive')}
                body={t('repaymentsUntrackedNote')}
                icon={<CalendarClock size={25} color={c.primary} />}
                action={
                  <Button
                    variant="outline"
                    label={t('saved')}
                    onPress={() =>
                      router.navigate({ pathname: '/loans', params: { pane: 'simulations' } })
                    }
                  />
                }
              />
            </View>
          );
        }}
      </TaskData>
      <Dialog
        bottom={width < 620}
        visible={!!selection}
        title={t(selection?.payment.paid ? 'repaymentsConfirmUndo' : 'repaymentsConfirmPaid')}
        onClose={() => {
          if (!save.isPending) setSelection(null);
        }}
      >
        {selection ? (
          <>
            <Text bold>{selection.title}</Text>
            <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.secondary, gap: 4 }}>
              <Text small muted>
                {t('repaymentsPeriod').replace('{n}', numeric(selection.payment.period, locale))} ·{' '}
                {date(selection.payment.date, locale)}
              </Text>
              <Text small muted>
                {t('repaymentsNextAmount')}
              </Text>
              <Heading size={26} style={{ fontVariant: ['tabular-nums'] }}>
                {money(selection.payment.payment)}
              </Heading>
            </View>
            <Text small muted>
              {t('repaymentsManualNotice')}
            </Text>
            {save.isError ? (
              <Text style={{ color: c.error }} role="alert">
                {t('repaymentsError')}
              </Text>
            ) : null}
            <Button
              label={t(selection.payment.paid ? 'repaymentsConfirmUndo' : 'repaymentsConfirmPaid')}
              loading={save.isPending}
              onPress={() => {
                if (!save.isPending) save.mutate(selection);
              }}
            />
          </>
        ) : null}
      </Dialog>
    </Page>
  );
}

function DuePanel({
  heading,
  items,
  total,
  range,
  overdue = false,
  onSelect,
}: {
  heading: string;
  items: DueRepayment[];
  total: number;
  range?: string;
  overdue?: boolean;
  onSelect: (item: DueRepayment) => void;
}) {
  const { t, money, locale, colors: c } = useDesign();
  const [shown, setShown] = useState(4);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 8,
        borderRadius: 20,
        padding: 18,
        backgroundColor: overdue ? c.surface : c.secondary,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {overdue ? (
          <CircleAlert size={18} color={c.warning} />
        ) : (
          <CalendarDays size={18} color={c.primary} />
        )}
        <Text bold small style={{ color: overdue ? c.warning : c.primary }}>
          {heading}
        </Text>
      </View>
      {items.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 9 }}>
          <Heading size={29} style={{ color: c.foreground, fontVariant: ['tabular-nums'] }}>
            {money(total)}
          </Heading>
          <Text small muted>
            {t('repaymentsPeriodsCount').replace('{n}', numeric(items.length, locale))}
          </Text>
        </View>
      ) : null}
      {range ? (
        <Text small style={{ color: c.muted }}>
          {range}
        </Text>
      ) : null}
      {!items.length ? (
        <Text small style={{ color: c.muted }}>
          {t('repaymentsNoDue')}
        </Text>
      ) : null}
      {items.slice(0, shown).map((item) => (
        <Action
          onPress={() => onSelect(item)}
          label={t('repaymentsReviewDue')
            .replace('{title}', item.title)
            .replace('{date}', date(item.date, locale))}
          key={item.loanId + ':' + item.period}
          style={{
            flexDirection: 'row',
            gap: 9,
            alignItems: 'center',
            borderTopWidth: 1,
            borderColor: c.border,
            paddingVertical: 7,
            borderRadius: 0,
          }}
        >
          <Text small style={{ flex: 1, color: c.foreground }}>
            {item.title} · {date(item.date, locale)}
          </Text>
          <Text small bold style={{ color: c.foreground, fontVariant: ['tabular-nums'] }}>
            {money(item.payment)}
          </Text>
          <ChevronRight size={16} color={c.muted} />
        </Action>
      ))}
      {items.length > shown ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            variant="outline"
            label={t('repaymentsMorePeriods')}
            onPress={() => setShown((current) => current + 8)}
          />
        </View>
      ) : null}
    </View>
  );
}

function LoanArticle({
  loan,
  today,
  onSelect,
}: {
  loan: TrackedRepayment;
  today: string;
  onSelect: (payment: TrackedPayment) => void;
}) {
  const { t, locale, money, colors: c } = useDesign();
  const [shown, setShown] = useState(6);
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
  const schedule = loan.schedule.filter((row) =>
    filter === 'all' ? true : filter === 'paid' ? row.paid : !row.paid,
  );
  const progress = t('repaymentsProgress')
    .replace('{paid}', numeric(loan.paidPeriods, locale))
    .replace('{total}', numeric(loan.schedule.length, locale));
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 22, padding: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: c.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CalendarDays size={19} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Heading size={23}>{loan.title}</Heading>
        </View>
      </View>
      <Text small bold>
        {progress}
      </Text>
      <Progress value={(100 * loan.paidPeriods) / loan.schedule.length} label={progress} />
      <View style={{ gap: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
        {(
          [
            ['repaymentsRemainingPrincipal', loan.remainingPrincipal],
            ['repaymentsRemainingTotal', loan.remainingRepayment],
          ] as const
        ).map(([label, amount]) => (
          <View key={label} style={{ flex: 1, minWidth: 132, gap: 4, paddingVertical: 7 }}>
            <Text small muted>
              {t(label)}
            </Text>
            <Text bold style={{ fontVariant: ['tabular-nums'] }}>
              {money(amount)}
            </Text>
          </View>
        ))}
      </View>
      <Heading size={20}>{t('repaymentsSchedule')}</Heading>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('repaymentsScheduleFilters')}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
      >
        {(
          [
            ['all', 'repaymentsFilterAll'],
            ['open', 'repaymentsFilterOpen'],
            ['paid', 'repaymentsFilterPaid'],
          ] as const
        ).map(([value, label]) => (
          <Action
            key={value}
            label={t(label)}
            role="tab"
            selected={filter === value}
            onPress={() => {
              setFilter(value);
              setShown(6);
            }}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: filter === value ? c.secondary : c.surface,
              paddingHorizontal: 10,
            }}
          >
            <Text
              small
              bold={filter === value}
              style={{ color: filter === value ? c.primary : c.muted }}
            >
              {t(label)}
            </Text>
          </Action>
        ))}
      </View>
      <View>
        {!schedule.length ? (
          <Text small muted>
            {t('repaymentsFilterEmpty')}
          </Text>
        ) : null}
        {schedule.slice(0, shown).map((payment) => {
          const overdue = !payment.paid && payment.date < today;
          const dueToday = !payment.paid && payment.date === today;
          const status = payment.paid
            ? 'repaymentsPaid'
            : overdue
              ? 'repaymentsPastDue'
              : dueToday
                ? 'repaymentsDueToday'
                : 'repaymentsUpcoming';
          return (
            <View
              key={payment.period}
              style={{
                borderRadius: 12,
                backgroundColor: c.background,
                marginBottom: 6,
                paddingHorizontal: 9,
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  backgroundColor: payment.paid ? c.secondary : c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {payment.paid ? (
                  <CircleCheck size={16} color={c.success} />
                ) : (
                  <CalendarDays size={15} color={c.muted} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 133, gap: 2 }}>
                <Text bold small>
                  {t('repaymentsPeriod').replace('{n}', numeric(payment.period, locale))} ·{' '}
                  {date(payment.date, locale)}
                </Text>
                <Text small muted>
                  {money(payment.payment)}
                </Text>
                <Text
                  small
                  bold
                  style={{
                    color: payment.paid ? c.success : overdue || dueToday ? c.warning : c.muted,
                  }}
                >
                  {t(status)}
                </Text>
                {payment.paid && payment.statusChangedAt ? (
                  <Text small muted>
                    {t('repaymentsRecordedOn').replace(
                      '{date}',
                      date(payment.statusChangedAt, locale),
                    )}
                  </Text>
                ) : null}
              </View>
              <Button
                variant="text"
                leading={payment.paid ? <CircleCheck size={17} color={c.success} /> : undefined}
                label={t(payment.paid ? 'repaymentsUndoPaid' : 'repaymentsMarkPaid')}
                onPress={() => onSelect(payment)}
              />
            </View>
          );
        })}
      </View>
      {schedule.length > shown ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            variant="outline"
            label={t('repaymentsMorePeriods')}
            onPress={() => setShown((current) => current + 12)}
          />
        </View>
      ) : null}
    </View>
  );
}
