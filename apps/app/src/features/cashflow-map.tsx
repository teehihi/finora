import { canShowReadData } from '../components/read-state';
import { useId, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChartNoAxesCombined, Info } from 'lucide-react-native';
import Svg, { Circle, ClipPath, Defs, Line, Path, Rect } from 'react-native-svg';
import { tokens } from '@finora/design-tokens';
import { projectCashflow, type CashflowEvent, type CashflowInput } from '@finora/financial-engine';
import { cashflowCopy, date } from '@finora/i18n';
import { Button, CurrencyInput, Eyebrow, Field, Heading, Text, useDesign } from '@finora/ui';
import { backTo, LinkRow, Page } from '../components/layout';
import { workspaceArtwork } from '../components/workspace-artwork';
import { SceneWash, WorkspaceModeRail } from '../components/workspace-scene';
import { TaskNotice, TaskSkeleton } from '../components/task-surface';
import {
  cashflowInputs,
  demoCashflow,
  emptyCashflowDraft,
  paymentsFromLedger,
  type CashflowField,
} from './cashflow-model';
import { MarketPanel } from './market-ui';
import { useRepaymentLedger } from './repayments';

type Projection = ReturnType<typeof projectCashflow>;

export function CashflowEntry({ attention = false }: { attention?: boolean }) {
  const { locale, colors: c } = useDesign();
  const copy = cashflowCopy(locale);
  return (
    <MarketPanel
      style={{
        paddingHorizontal: 12,
        paddingVertical: 1,
        backgroundColor: attention ? c.actionAmberSurface : c.surface,
      }}
    >
      <LinkRow
        title={copy.title}
        body={copy.link}
        icon={<ChartNoAxesCombined size={20} color={attention ? c.actionAmber : c.primary} />}
        onPress={() => router.push('/cashflow')}
      />
    </MarketPanel>
  );
}

function BalanceChart({ projection }: { projection: Projection }) {
  const { colors: c, locale } = useDesign();
  const copy = cashflowCopy(locale);
  const { days, lowest } = projection;
  const [chartWidth, setChartWidth] = useState(300);
  const negative = 'balance-negative-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const values = days.map((day) => day.balance);
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const y = (value: number) => 10 + (high - value) * (88 / Math.max(1, high - low));
  const x = (index: number) => 8 + (index * (chartWidth - 16)) / (days.length - 1);
  const graph = days
    .map((day, index) => (index ? `H${x(index)}V${y(day.balance)}` : `M${x(0)} ${y(day.balance)}`))
    .join(' ');
  const lowIndex = days.indexOf(lowest);
  const cut = y(0);
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  return (
    <View style={{ gap: 4 }}>
      <View
        testID="cashflow-balance-chart"
        onLayout={({ nativeEvent }) => setChartWidth(Math.max(40, nativeEvent.layout.width))}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height={112} viewBox={`0 0 ${chartWidth} 112`}>
          <Defs>
            <ClipPath id={negative}>
              <Rect x={7} y={cut} width={chartWidth - 14} height={105 - cut} />
            </ClipPath>
          </Defs>
          {low < 0 ? (
            <Rect
              x={8}
              y={cut}
              width={chartWidth - 16}
              height={105 - cut}
              fill={c.actionAmberSurface}
            />
          ) : null}
          <Line x1={8} y1={28} x2={x(days.length - 1)} y2={28} stroke={c.border} />
          <Line x1={8} y1={58} x2={x(days.length - 1)} y2={58} stroke={c.border} />
          <Line
            x1={8}
            y1={cut}
            x2={x(days.length - 1)}
            y2={cut}
            stroke={c.borderStrong}
            strokeDasharray="4 4"
          />
          <Path d={graph} stroke={c.chartPrincipal} strokeWidth={2.3} fill="none" />
          {low < 0 ? (
            <Path
              d={graph}
              stroke={c.actionAmber}
              strokeWidth={2.6}
              fill="none"
              clipPath={`url(#${negative})`}
            />
          ) : null}
          <Circle
            cx={x(lowIndex)}
            cy={y(lowest.balance)}
            r={3.8}
            fill={low < 0 ? c.actionAmber : c.chartPrincipal}
          />
        </Svg>
      </View>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}
      >
        <Text small style={{ color: c.muted }}>
          {shortDate.format(new Date(days[0]!.date))}
        </Text>
        <Text small style={{ color: c.muted }}>
          {copy.zero}
        </Text>
        <Text small style={{ color: c.muted }}>
          {shortDate.format(new Date(days.at(-1)!.date))}
        </Text>
      </View>
    </View>
  );
}

function Movement({ event, showDate = true }: { event: CashflowEvent; showDate?: boolean }) {
  const { locale, colors: c, money } = useDesign();
  const copy = cashflowCopy(locale);
  const title =
    event.kind === 'repayment' ? event.title : event.kind === 'income' ? copy.salary : copy.bills;
  return (
    <View style={{ borderTopWidth: 1, borderColor: c.border, paddingVertical: 9, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
        {showDate ? (
          <Text small muted>
            {date(event.date, locale)}
          </Text>
        ) : null}
        <Text small bold style={{ flexShrink: 1 }}>
          {title}
        </Text>
        <Text
          small
          bold
          style={{ marginLeft: 'auto', color: event.amount > 0 ? c.success : c.foreground }}
        >
          {event.amount > 0 ? '+' : '−'}
          {money(Math.abs(event.amount))}
        </Text>
      </View>
      {event.kind === 'repayment' && event.due < event.date ? (
        <Text small muted>
          {copy.overdue} {date(event.due, locale)}
        </Text>
      ) : null}
    </View>
  );
}

function Forecast({
  base,
  input,
  sample,
  afterChart,
}: {
  base: Projection;
  input: CashflowInput;
  sample: boolean;
  afterChart?: React.ReactNode;
}) {
  const [buffer, setBuffer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { colors: c, locale, money } = useDesign();
  const copy = cashflowCopy(locale);
  const alternate = useMemo(() => {
    if (!base.bufferNeeded) return null;
    try {
      return projectCashflow(input, base.bufferNeeded);
    } catch {
      return null;
    }
  }, [base, input]);
  const shownBuffer = buffer && !!alternate;
  const result = buffer && alternate ? alternate : base;
  const rows = result.days.filter((day) => day.events.length > 0);
  const first = result.firstShortfall;
  const recovery = result.recovery;
  const amount = money(result.bufferNeeded);
  const amountSize = amount.length > 18 ? 22 : amount.length > 14 ? 27 : 36;
  return (
    <View style={{ gap: 12, minWidth: 0 }}>
      <View
        style={{
          gap: 9,
          padding: 16,
          borderRadius: tokens.radius.card,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        }}
      >
        <View style={{ gap: 4, borderRadius: 14, overflow: 'hidden', padding: 9, margin: -4 }}>
          <SceneWash image={workspaceArtwork.cashflow} subdued />
          <Eyebrow tone="muted">
            {sample ? copy.sampleLabel + ' · ' : ''}
            {shownBuffer ? copy.buffer : copy.base}
          </Eyebrow>
          <View accessibilityLiveRegion="polite" style={{ gap: 3 }}>
            {first ? (
              <>
                <Text small bold style={{ color: c.actionAmber }}>
                  {copy.short}
                </Text>
                <Heading size={amountSize} style={{ fontVariant: ['tabular-nums'] }}>
                  {amount}
                </Heading>
                <Text small muted>
                  {copy.first}: {date(first.date, locale)}
                </Text>
              </>
            ) : (
              <>
                <Heading size={28}>{copy.safe}</Heading>
                <Text small muted>
                  {copy.least}: {money(result.lowest.balance)}
                </Text>
              </>
            )}
          </View>
        </View>
        <BalanceChart projection={result} />
        {shownBuffer ? (
          <Text small muted>
            {copy.otherwise}: {money(base.bufferNeeded)}. {copy.base}: {base.shortfallDays} ·{' '}
            {copy.shortDays.toLowerCase()}.
          </Text>
        ) : null}
      </View>
      {first ? (
        <MarketPanel style={{ gap: 5, paddingVertical: 10 }}>
          <Heading size={18}>
            {locale === 'vi-VN' ? 'Các mốc ảnh hưởng số dư' : 'What moved your balance'}
          </Heading>
          {[...first.events, ...(recovery?.events ?? [])].map((event) => (
            <Movement key={event.id} event={event} />
          ))}
          <Text small muted>
            {recovery ? copy.recovery + ': ' + date(recovery.date, locale) : copy.noRecovery}
          </Text>
        </MarketPanel>
      ) : null}
      {alternate ? (
        <Button
          variant={shownBuffer ? 'outline' : 'primary'}
          label={shownBuffer ? copy.restore : copy.buffer + ': ' + money(base.bufferNeeded)}
          onPress={() => setBuffer(!shownBuffer)}
          icon={<ArrowRight size={17} color={shownBuffer ? c.primary : c.onPrimary} />}
        />
      ) : null}
      {first ? (
        <Text small muted>
          {copy.shortDays}: {result.shortfallDays} · {copy.least}:{' '}
          {date(result.lowest.date, locale)}
        </Text>
      ) : null}
      {sample ? (
        <Text small muted>
          {copy.sampleNote}
        </Text>
      ) : null}
      {afterChart}
      <MarketPanel style={{ gap: 4 }}>
        <Heading size={19}>{copy.timeline}</Heading>
        {rows.length ? (
          (expanded ? rows : rows.slice(0, 6)).map((day) => (
            <View key={day.date} style={{ paddingTop: 10 }}>
              <Text small bold>
                {date(day.date, locale)}
              </Text>
              {day.events.map((event) => (
                <Movement key={event.id} event={event} showDate={false} />
              ))}
              <Text
                small
                muted
                style={{ paddingBottom: 9, color: day.balance < 0 ? c.error : c.muted }}
              >
                {copy.endDay}: {money(day.balance)}
              </Text>
            </View>
          ))
        ) : (
          <Text small muted>
            {copy.noEvents}
          </Text>
        )}
        {rows.length > 6 ? (
          <Button
            variant="text"
            label={expanded ? copy.fewer : copy.more}
            onPress={() => setExpanded(!expanded)}
          />
        ) : null}
      </MarketPanel>
    </View>
  );
}

function CashflowWorkspace({
  ledger,
}: {
  ledger: ReturnType<typeof useRepaymentLedger>['ledger'];
}) {
  const { colors: c, locale, money } = useDesign();
  const copy = cashflowCopy(locale);
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= tokens.breakpoints.desktop && fontScale < 1.25;
  const compact = width < tokens.breakpoints.rail;
  const back = () => backTo('/home');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [mode, setMode] = useState<'personal' | 'sample'>('personal');
  const [draft, setDraft] = useState(emptyCashflowDraft);
  const [submitted, setSubmitted] = useState(false);
  const sample = mode === 'sample';
  const checked = cashflowInputs(draft);
  const data = canShowReadData(ledger) ? ledger.data : undefined;
  const calculated = useMemo(() => {
    try {
      let input: CashflowInput;
      if (mode === 'sample') input = demoCashflow(copy.installment);
      else {
        const fields = cashflowInputs(draft).value;
        if (!submitted || !fields || !data) return null;
        input = { ...fields, start: data.today, payments: paymentsFromLedger(data) };
      }
      return { input, projection: projectCashflow(input) };
    } catch {
      return 'error';
    }
  }, [copy.installment, data, draft, mode, submitted]);

  function update(field: CashflowField, text: string) {
    setDraft((previous) => ({ ...previous, [field]: text }));
    setSubmitted(false);
  }
  function submit() {
    setSubmitted(true);
    if (checked.value) scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function openMode(next: typeof mode) {
    if (mode === next) return;
    setMode(next);
    if (next === 'personal') setSubmitted(false);
  }

  const form = (
    <MarketPanel style={{ gap: 14 }}>
      <Heading size={21}>{copy.assumptions}</Heading>
      <CurrencyInput
        label={copy.opening}
        hint={copy.openingHint}
        value={draft.opening}
        onChangeText={(v) => update('opening', v)}
        maxLength={24}
        error={submitted && checked.errors.opening ? copy.amountError : undefined}
      />
      <Text small muted>
        {copy.fieldNote}
      </Text>
      {(['income', 'expense'] as const).map((key) => {
        const dayKey = key === 'income' ? 'incomeDay' : 'expenseDay';
        return (
          <View key={key} style={{ gap: 9 }}>
            <CurrencyInput
              label={copy[key]}
              value={draft[key]}
              onChangeText={(v) => update(key, v)}
              maxLength={24}
              error={submitted && checked.errors[key] ? copy.amountError : undefined}
            />
            <Field
              label={copy[dayKey]}
              value={draft[dayKey]}
              onChangeText={(v) => update(dayKey, v)}
              maxLength={2}
              inputMode="numeric"
              keyboardType="number-pad"
              error={submitted && checked.errors[dayKey] ? copy.dayError : undefined}
            />
          </View>
        );
      })}
      <Text small muted>
        {copy.shortMonth}
      </Text>
      {submitted && !checked.value ? (
        <Text small role="alert" style={{ color: c.error }}>
          {copy.checkFields}
        </Text>
      ) : null}
      <Button label={copy.calculate} disabled={!data} onPress={submit} />
      <Text small muted>
        {copy.sourceNote}
      </Text>
      {!data && ledger.isFetching ? <TaskSkeleton kind="rows" /> : null}
    </MarketPanel>
  );

  const input = calculated && calculated !== 'error' ? calculated.input : null;
  const summary = input ? (
    <MarketPanel>
      <Heading size={21}>{copy.assumptions}</Heading>
      <Text small>
        {copy.opening}: {money(input.opening)}
      </Text>
      <Text small>
        {copy.salary}: {money(input.income.amount)}
        {input.income.amount ? ' · ' + copy.eachMonth + ' ' + input.income.day : ''}
      </Text>
      <Text small>
        {copy.bills}: {money(input.expense.amount)}
        {input.expense.amount ? ' · ' + copy.eachMonth + ' ' + input.expense.day : ''}
      </Text>
      <Text small muted>
        {copy.sourceNote}
      </Text>
      <Button
        variant="outline"
        label={copy.edit}
        onPress={() => {
          setSubmitted(false);
          scroll.current?.scrollTo({ y: 0, animated: false });
        }}
      />
    </MarketPanel>
  ) : null;

  return (
    <Page
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.intro}
      scrollRef={scroll}
      detail={{ onBack: back }}
      showDescriptionOnPhone={false}
    >
      <WorkspaceModeRail
        value={mode}
        options={[
          { value: 'personal', label: copy.personal },
          { value: 'sample', label: copy.sample },
        ]}
        onChange={openMode}
      />
      {!sample && (ledger.isError || ledger.isFetching || ledger.fetchStatus === 'paused') ? (
        <View>
          <TaskNotice query={ledger} stale={!!data} missing={copy.dataError} />
        </View>
      ) : null}
      {calculated === 'error' ? (
        <Text role="alert" style={{ color: c.error }}>
          {copy.mathError}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'flex-start' : 'stretch',
          gap: 18,
        }}
      >
        {calculated && calculated !== 'error' ? (
          <View style={{ flex: wide ? 1.35 : undefined, minWidth: 0 }}>
            <Forecast
              key={mode}
              base={calculated.projection}
              input={calculated.input}
              sample={sample}
              afterChart={!wide && !sample ? summary : null}
            />
          </View>
        ) : null}
        {!sample && (wide || !summary) ? (
          <View
            style={{
              flex: wide ? 1 : undefined,
              minWidth: 0,
              maxWidth: wide && !summary ? 620 : undefined,
            }}
          >
            {summary ?? form}
          </View>
        ) : null}
      </View>
      {compact ? (
        <Text small muted>
          {copy.intro}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Info size={17} color={c.muted} />
        <Text small muted style={{ flex: 1 }}>
          {copy.note}
        </Text>
      </View>
    </Page>
  );
}

export function CashflowMap() {
  const { ledger, userId } = useRepaymentLedger();
  return <CashflowWorkspace key={userId ?? 'signed-out'} ledger={ledger} />;
}
