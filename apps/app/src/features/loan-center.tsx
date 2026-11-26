import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { ArrowRight, CalendarDays, ChevronRight, CircleCheck, Wallet } from 'lucide-react-native';
import { Action, Button, EmptyState, Heading, Text, useDesign } from '@finora/ui';
import { date, numeric } from '@finora/i18n';
import type { RepaymentLedger, TrackedRepayment } from '@finora/contracts';
import { RepaymentPlanner } from './repayment-planner';

const unpaid = (loan: TrackedRepayment) => loan.schedule.filter((payment) => !payment.paid);
const openLedger = () => router.push('/repayments');

export function FilterTab({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors: c, locale } = useDesign();
  return (
    <Action
      role="tab"
      label={label}
      selected={selected}
      onPress={onPress}
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 5,
        borderRadius: 0,
        borderBottomWidth: 2,
        borderColor: selected ? c.primary : 'transparent',
        minWidth: 0,
        flexShrink: 1,
      }}
    >
      <Text small bold={selected} style={{ color: selected ? c.primary : c.muted, flexShrink: 1 }}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text small muted>
          {numeric(count, locale)}
        </Text>
      ) : null}
    </Action>
  );
}

export function PaymentFocus({ value, desktop }: { value: RepaymentLedger; desktop: boolean }) {
  const { t, colors: c, money, locale } = useDesign();
  const [plan, setPlan] = useState<string>();
  const pending = value.loans.flatMap((loan) =>
    unpaid(loan).map((p) => ({ ...p, title: loan.title })),
  );
  const nextDay = pending.map((p) => p.date).sort()[0];
  if (!nextDay) return null;
  const due = pending.filter((p) => p.date === nextDay);
  const total = due.reduce((sum, p) => sum + p.payment, 0);
  const past = nextDay < value.today;
  const dateLabel =
    nextDay === value.today
      ? t('loanCenterToday')
      : t('loanCenterDue').replace('{date}', date(nextDay, locale));
  const subtitle =
    due.length === 1
      ? due[0].title
      : t('loanCenterMultiple').replace('{count}', numeric(due.length, locale));
  const primary = t(past ? 'repaymentsOpen' : 'loanCenterPlan');
  const background = past ? c.actionAmberSurface : c.forest;
  const opposite = past ? c.foreground : c.onForest;
  const low = past ? c.muted : c.onForestMuted;
  return (
    <View
      style={{
        position: 'relative',
        overflow: 'hidden',
        alignSelf: 'stretch',
        borderRadius: 23,
        backgroundColor: background,
        padding: desktop ? 24 : 17,
        gap: 9,
      }}
    >
      {!past ? (
        <View
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            top: -12,
            right: -10,
            width: desktop ? 360 : 225,
            height: '112%',
          }}
        >
          <Svg
            viewBox="0 0 288 220"
            width="100%"
            height="100%"
            preserveAspectRatio="xMaxYMin slice"
          >
            <Path
              d="M7 230C27 68 163 105 278 26 250 127 83 115 7 230Z M26 227C59 103 170 124 282 48 239 142 100 142 26 227Z M45 227C88 134 190 146 288 70 249 154 137 161 45 227Z M67 227C121 168 203 167 289 95 244 176 168 183 67 227Z"
              stroke={c.onForestMuted}
              opacity={0.26}
              strokeWidth={1.15}
              fill="none"
            />
            <Path d="m211 52 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill={c.onForestMuted} opacity={0.7} />
          </Svg>
        </View>
      ) : null}
      <Text small bold style={{ color: past ? c.actionAmber : low }}>
        {t(past ? 'loanCenterPast' : 'loanCenterNext')}
      </Text>
      <Heading size={desktop ? 45 : 38} style={{ color: opposite, fontVariant: ['tabular-nums'] }}>
        {money(total)}
      </Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
        <Text small bold style={{ color: opposite }}>
          {dateLabel}
        </Text>
        <Text small style={{ color: low }}>
          ·
        </Text>
        <Text small style={{ color: low, flexShrink: 1 }}>
          {subtitle}
        </Text>
      </View>
      <Action
        label={primary}
        onPress={past ? openLedger : () => setPlan(nextDay)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 46,
          width: '100%',
          maxWidth: desktop ? 360 : undefined,
          paddingHorizontal: 13,
          marginTop: 6,
          gap: 10,
          borderRadius: 12,
          backgroundColor: past ? c.surface : '#D9EBC5',
        }}
      >
        <Text small bold style={{ flexShrink: 1, color: past ? c.primary : '#133D2E' }}>
          {primary}
        </Text>
        <ArrowRight color={past ? c.primary : '#133D2E'} size={18} />
      </Action>
      {!past && plan === nextDay ? (
        <RepaymentPlanner due={total} dueDate={nextDay} onClose={() => setPlan(undefined)} />
      ) : null}
    </View>
  );
}

export function LoanList({ value, onPlans }: { value: RepaymentLedger; onPlans: () => void }) {
  const { t, colors: c, money, locale } = useDesign();
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  if (!value.loans.length) {
    return (
      <EmptyState
        title={t('loanCenterEmpty')}
        body={t('loanCenterEmptyBody')}
        icon={<CalendarDays size={24} color={c.primary} />}
        action={<Button variant="outline" label={t('loanCenterPlansTab')} onPress={onPlans} />}
      />
    );
  }
  const item = value.loans.map((loan) => {
    const remaining = unpaid(loan).sort(
      (a, b) => a.date.localeCompare(b.date) || a.period - b.period,
    );
    return { loan, remaining, next: remaining[0] };
  });
  const active = item
    .filter(({ next }) => next)
    .sort((a, b) => a.next.date.localeCompare(b.next.date));
  const complete = item.filter(({ next }) => !next);
  const list = done ? complete : active;
  const nextMonth = active
    .flatMap(({ remaining }) => remaining.map((p) => p.date))
    .filter((d) => d >= value.today)
    .sort()[0];
  const month = (nextMonth ?? value.today).slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    new Date(month + '-01T12:00:00Z'),
  );
  const monthTotal = active.reduce(
    (sum, row) =>
      sum +
      row.remaining.filter((p) => p.date.startsWith(month)).reduce((n, p) => n + p.payment, 0),
    0,
  );
  return (
    <View style={{ gap: 10 }}>
      <Heading size={22}>{t('loanCenterTracked')}</Heading>
      <View
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderColor: c.border }}
      >
        <FilterTab
          label={t('loanCenterActive')}
          count={active.length}
          selected={!done}
          onPress={() => setDone(false)}
        />
        <FilterTab
          label={t('loanCenterCompleted')}
          count={complete.length}
          selected={done}
          onPress={() => setDone(true)}
        />
      </View>
      {list.length ? (
        list.map(({ loan, next }, index) => {
          const shown = expanded === loan.id;
          const period = t('repaymentsPeriod').replace('{n}', numeric(next?.period ?? 0, locale));
          const progress = t('repaymentsProgress')
            .replace('{paid}', numeric(loan.paidPeriods, locale))
            .replace('{total}', numeric(loan.schedule.length, locale));
          const Icon = next ? Wallet : CircleCheck;
          return (
            <View key={loan.id} style={{ borderTopWidth: index ? 1 : 0, borderColor: c.border }}>
              <Action
                label={loan.title}
                selected={shown}
                onPress={() => setExpanded(shown ? undefined : loan.id)}
                style={{
                  flexDirection: 'row',
                  gap: 9,
                  alignItems: 'center',
                  minHeight: 57,
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    backgroundColor: c.secondary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Icon size={19} color={c.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text bold>{loan.title}</Text>
                  <Text small muted>
                    {next ? date(next.date, locale) + ' · ' + period : progress}
                  </Text>
                </View>
                {next ? (
                  <Text
                    small
                    bold
                    style={{ textAlign: 'right', flexShrink: 1, fontVariant: ['tabular-nums'] }}
                  >
                    {money(next.payment)}
                  </Text>
                ) : null}
                <ChevronRight
                  size={16}
                  color={c.muted}
                  style={{ transform: [{ rotate: shown ? '90deg' : '0deg' }] }}
                />
              </Action>
              {shown && next ? (
                <View style={{ paddingLeft: 47, paddingBottom: 10, gap: 3 }}>
                  <Text small muted>
                    {t('principal')}: {money(next.principal)} · {t('interest')}:{' '}
                    {money(next.interest)}
                  </Text>
                  <Text small muted>
                    {progress}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <Text muted small>
          {t(done ? 'loanCenterNoneCompleted' : 'loanCenterNoneActive')}
        </Text>
      )}
      {!done && monthTotal > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 6,
            backgroundColor: c.secondary,
            padding: 12,
            borderRadius: 11,
          }}
        >
          <Text small muted>
            {t('loanCenterMonth').replace('{month}', monthLabel.toLocaleLowerCase(locale))}
          </Text>
          <Text small bold>
            {money(monthTotal)}
          </Text>
        </View>
      ) : null}
      {value.overdueTotal > 0 && !done ? (
        <Text small bold style={{ color: c.actionAmber }}>
          {t('loanCenterPastTotal')}: {money(value.overdueTotal)}
        </Text>
      ) : null}
      {!active.some(({ next }) => next.date < value.today) ? (
        <Button label={t('repaymentsOpen')} variant="outline" onPress={openLedger} />
      ) : null}
    </View>
  );
}
