import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CircleCheck } from 'lucide-react-native';
import { Button, Dialog, Heading, Progress, Text, useDesign } from '@finora/ui';
import { date, numeric } from '@finora/i18n';
import type { DueRepayment, TrackedPayment, TrackedRepayment } from '@finora/contracts';
import { Back, Data, Page } from '../../src/components/layout';
import { ledgerKey, useRepaymentLedger } from '../../src/features/repayments';
import { api } from '../../src/services/client';

type RowSelection = { loanId: string; title: string; payment: TrackedPayment };

export default function Repayments() {
  const { t, money, colors: c, locale } = useDesign();
  const { width } = useWindowDimensions();
  const { ledger, userId } = useRepaymentLedger();
  const qc = useQueryClient();
  const [selection, setSelection] = useState<RowSelection | null>(null);
  const save = useMutation({
    mutationFn: (next: RowSelection) =>
      api.setRepaymentPaid(next.loanId, next.payment.period, {
        paid: !next.payment.paid,
        confirmed: true,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ledgerKey(userId) });
      setSelection(null);
    },
  });

  return (
    <Page
      title={t('repaymentsTitle')}
      eyebrow={t('repaymentsKicker')}
      description={t('repaymentsIntro')}
      top={<Back to={() => router.navigate('/loans')} />}
    >
      <Data q={ledger}>
        {(value) =>
          value.loans.length ? (
            <>
              <View style={{ flexDirection: width >= 1024 ? 'row' : 'column', gap: 14 }}>
                <DuePanel
                  heading={t('repaymentsDueNext')}
                  items={value.upcoming}
                  total={value.upcomingTotal}
                  range={date(value.today, locale) + ' – ' + date(value.through, locale)}
                />
                <DuePanel
                  heading={t('repaymentsLate')}
                  items={value.overdue}
                  total={value.overdueTotal}
                  overdue
                />
              </View>
              <Text small muted>
                {t('repaymentsTotalsNote')}
              </Text>
              {value.loans.map((loan) => (
                <LoanArticle
                  key={loan.id}
                  loan={loan}
                  onSelect={(payment) => {
                    save.reset();
                    setSelection({ loanId: loan.id, title: loan.title, payment });
                  }}
                />
              ))}
            </>
          ) : (
            <View
              style={{
                gap: 12,
                alignItems: 'flex-start',
                paddingVertical: 20,
                borderTopWidth: 1,
                borderColor: c.border,
              }}
            >
              <CalendarClock size={21} color={c.primary} />
              <Heading size={24}>{t('emptyActive')}</Heading>
              <Text muted>{t('repaymentsUntrackedNote')}</Text>
              <Button
                variant="outline"
                label={t('saved')}
                onPress={() => router.navigate('/loans')}
              />
            </View>
          )
        }
      </Data>
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
            <Text>
              {t('repaymentsPeriod').replace('{n}', numeric(selection.payment.period, locale))} ·{' '}
              {date(selection.payment.date, locale)} · {money(selection.payment.payment)}
            </Text>
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
}: {
  heading: string;
  items: DueRepayment[];
  total: number;
  range?: string;
  overdue?: boolean;
}) {
  const { t, money, locale, colors: c } = useDesign();
  const [shown, setShown] = useState(4);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 8,
        borderRadius: 14,
        padding: 18,
        backgroundColor: overdue ? c.elevated : c.forest,
      }}
    >
      <Text bold small style={{ color: overdue ? c.warning : c.onForestMuted }}>
        {heading}
      </Text>
      <Heading
        size={30}
        style={{ color: overdue ? c.foreground : c.onForest, fontVariant: ['tabular-nums'] }}
      >
        {money(total)}
      </Heading>
      {range ? (
        <Text small style={{ color: c.onForestMuted }}>
          {range}
        </Text>
      ) : null}
      {!items.length ? (
        <Text small style={{ color: overdue ? c.muted : c.onForestMuted }}>
          {t('repaymentsNoDue')}
        </Text>
      ) : null}
      {items.slice(0, shown).map((item) => (
        <View
          key={item.loanId + ':' + item.period}
          style={{
            flexDirection: 'row',
            gap: 9,
            alignItems: 'baseline',
            borderTopWidth: 1,
            borderColor: overdue ? c.border : 'rgba(218,229,217,0.25)',
            paddingVertical: 7,
          }}
        >
          <Text small style={{ flex: 1, color: overdue ? c.foreground : c.onForest }}>
            {item.title} · {date(item.date, locale)}
          </Text>
          <Text
            small
            bold
            style={{ color: overdue ? c.foreground : c.onForest, fontVariant: ['tabular-nums'] }}
          >
            {money(item.payment)}
          </Text>
        </View>
      ))}
      {items.length > shown ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            variant={overdue ? 'outline' : 'onForest'}
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
  onSelect,
}: {
  loan: TrackedRepayment;
  onSelect: (payment: TrackedPayment) => void;
}) {
  const { t, locale, money, colors: c } = useDesign();
  const [shown, setShown] = useState(6);
  const progress = t('repaymentsProgress')
    .replace('{paid}', numeric(loan.paidPeriods, locale))
    .replace('{total}', numeric(loan.schedule.length, locale));
  return (
    <View style={{ paddingTop: 19, borderTopWidth: 1, borderColor: c.border, gap: 12 }}>
      <Heading size={25}>{loan.title}</Heading>
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
      <View>
        {[...loan.schedule.slice(0, shown)].map((payment) => (
          <View
            key={payment.period}
            style={{
              borderTopWidth: 1,
              borderColor: c.border,
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              paddingVertical: 8,
            }}
          >
            <View style={{ flex: 1, minWidth: 133, gap: 2 }}>
              <Text bold small>
                {t('repaymentsPeriod').replace('{n}', numeric(payment.period, locale))} ·{' '}
                {date(payment.date, locale)}
              </Text>
              <Text small muted>
                {money(payment.payment)} ·{' '}
                {t(payment.paid ? 'repaymentsPaid' : 'repaymentsNotPaid')}
              </Text>
            </View>
            <Button
              variant="text"
              leading={payment.paid ? <CircleCheck size={17} color={c.success} /> : undefined}
              label={t(payment.paid ? 'repaymentsUndoPaid' : 'repaymentsMarkPaid')}
              onPress={() => onSelect(payment)}
            />
          </View>
        ))}
      </View>
      {loan.schedule.length > shown ? (
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
