import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useMutation } from '@tanstack/react-query';
import { Button, Field, Heading, Progress, Text, useDesign } from '@finora/ui';
import { repaymentPreparationSchema, type RepaymentPreparationInput } from '@finora/contracts';
import { repaymentProactive, date } from '@finora/i18n';
import { backTo, Page } from '../../../src/components/layout';
import { TaskData } from '../../../src/components/task-surface';
import { useRepaymentLedger } from '../../../src/features/repayments';
import { api } from '../../../src/services/client';

type MoneyField = 'availableFunds' | 'incomeAmount' | 'expensesAmount' | 'reserve';
type DayField = 'incomeDay' | 'expensesDay';
const moneyFields: MoneyField[] = ['availableFunds', 'incomeAmount', 'expensesAmount', 'reserve'];
const dayFields: DayField[] = ['incomeDay', 'expensesDay'];
const fieldLabels = {
  availableFunds: 'available',
  incomeAmount: 'income',
  incomeDay: 'incomeDay',
  expensesAmount: 'expenses',
  expensesDay: 'expensesDay',
  reserve: 'reserve',
} as const;

export default function PreparePayment() {
  const params = useLocalSearchParams<{ id: string; period?: string }>();
  const { locale, colors: c, money } = useDesign();
  const s = repaymentProactive[locale];
  const { ledger } = useRepaymentLedger();
  const [fields, setFields] = useState<Record<MoneyField | DayField, string>>({
    availableFunds: '',
    incomeAmount: '',
    incomeDay: '',
    expensesAmount: '',
    expensesDay: '',
    reserve: '',
  });
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [plannedExpenses, setPlannedExpenses] = useState<
    RepaymentPreparationInput['plannedExpenses']
  >([]);
  const [invalid, setInvalid] = useState(false);
  const period = Number(params.period);
  const loan = ledger.data?.loans.find((item) => item.id === params.id);
  const payment = loan?.schedule.find((item) => item.period === period);
  const plan = useMutation({
    mutationFn: (input: RepaymentPreparationInput) =>
      api.repaymentPreparation(params.id, period, input),
  });
  const parse = (value: string) =>
    value.trim() === '' ? null : /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
  return (
    <Page title={s.prepare} detail={{ onBack: () => backTo('/repayments') }}>
      <TaskData query={ledger}>
        {() =>
          loan && payment ? (
            <View style={{ gap: 17, maxWidth: 900 }}>
              <View style={{ padding: 18, borderRadius: 20, backgroundColor: c.secondary, gap: 5 }}>
                <Heading size={21}>{loan.title}</Heading>
                <Text>
                  {date(payment.date, locale)} · {money(payment.remainingAmount)}
                </Text>
                <Text small muted>
                  {s.manual}
                </Text>
              </View>
              <View style={{ padding: 18, borderRadius: 20, backgroundColor: c.surface, gap: 12 }}>
                <Heading size={20}>{s.prepare}</Heading>
                {[...moneyFields, ...dayFields].map((field) => (
                  <Field
                    key={field}
                    label={s[fieldLabels[field]]}
                    value={fields[field]}
                    onChangeText={(value) => {
                      setFields((current) => ({ ...current, [field]: value }));
                      setInvalid(false);
                    }}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={15}
                    editable={!plan.isPending}
                  />
                ))}
                <Heading size={17}>
                  {locale === 'vi-VN' ? 'Chi phí phát sinh dự kiến' : 'Planned one-off expenses'}
                </Heading>
                <Field
                  label={locale === 'vi-VN' ? 'Tên khoản chi' : 'Expense name'}
                  value={expenseTitle}
                  onChangeText={setExpenseTitle}
                  maxLength={80}
                />
                <Field
                  label={locale === 'vi-VN' ? 'Ngày chi (YYYY-MM-DD)' : 'Expense date (YYYY-MM-DD)'}
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  maxLength={10}
                />
                <Field
                  label={locale === 'vi-VN' ? 'Số tiền (VND)' : 'Amount (VND)'}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  keyboardType="number-pad"
                  maxLength={15}
                />
                <Button
                  variant="outline"
                  label={locale === 'vi-VN' ? 'Thêm khoản chi' : 'Add expense'}
                  onPress={() => {
                    const amount = parse(expenseAmount);
                    if (
                      !expenseTitle.trim() ||
                      !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) ||
                      amount === null ||
                      !Number.isSafeInteger(amount) ||
                      amount < 0
                    ) {
                      setInvalid(true);
                      return;
                    }
                    setPlannedExpenses((current) => [
                      ...current,
                      { id: randomUUID(), title: expenseTitle.trim(), date: expenseDate, amount },
                    ]);
                    setExpenseTitle('');
                    setExpenseDate('');
                    setExpenseAmount('');
                    setInvalid(false);
                  }}
                />
                {plannedExpenses.map((item) => (
                  <Text key={item.id} small>
                    {item.title} · {date(item.date, locale)} · {money(item.amount)}
                  </Text>
                ))}
                {invalid || plan.isError ? (
                  <Text role="alert" style={{ color: c.error }}>
                    {s.error}
                  </Text>
                ) : null}
                <Button
                  label={s.calculate}
                  loading={plan.isPending}
                  onPress={() => {
                    const candidate = repaymentPreparationSchema.safeParse({
                      availableFunds: parse(fields.availableFunds),
                      incomeAmount: parse(fields.incomeAmount),
                      incomeDay: parse(fields.incomeDay),
                      expensesAmount: parse(fields.expensesAmount),
                      expensesDay: parse(fields.expensesDay),
                      reserve: parse(fields.reserve),
                      plannedExpenses,
                      confirmed: true,
                    });
                    setInvalid(!candidate.success);
                    if (candidate.success) plan.mutate(candidate.data);
                  }}
                />
                <Text small muted>
                  {s.assumptions}
                </Text>
              </View>
              {plan.data?.status === 'insufficient_information' ? (
                <View style={{ padding: 16, backgroundColor: c.surface, borderRadius: 18 }}>
                  <Heading size={19}>{s.missing}</Heading>
                  <Text>
                    {plan.data.missing
                      .map((key) => s[fieldLabels[key as keyof typeof fieldLabels]] ?? key)
                      .join(', ')}
                  </Text>
                </View>
              ) : null}
              {plan.data?.status === 'projected' ? (
                <View
                  style={{ padding: 18, borderRadius: 20, backgroundColor: c.surface, gap: 12 }}
                >
                  <Heading size={20}>
                    {s.need}: {money(plan.data.result.additionalNeeded)}
                  </Heading>
                  <Progress
                    value={
                      payment.remainingAmount
                        ? Math.min(
                            100,
                            (100 * (Number(fields.availableFunds) || 0)) / payment.remainingAmount,
                          )
                        : 0
                    }
                    label={s.available}
                  />
                  <Text>
                    {s.daily}: {money(plan.data.result.dailyGoal)}
                  </Text>
                  <Text>
                    {s.weekly}: {money(plan.data.result.weeklyGoal)}
                  </Text>
                  <Text>
                    {s.afterDue}: {money(plan.data.result.balanceAfterDue)}
                  </Text>
                  <Text>
                    {plan.data.result.firstShortfall
                      ? `${s.firstShortfall}: ${date(plan.data.result.firstShortfall, locale)}`
                      : s.noShortfall}
                  </Text>
                  {plan.data.result.days
                    .filter((day) => day.date <= payment.date)
                    .slice(-7)
                    .map((day) => (
                      <View
                        key={day.date}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          borderTopWidth: 1,
                          borderColor: c.border,
                          paddingTop: 6,
                        }}
                      >
                        <Text small>{date(day.date, locale)}</Text>
                        <Text small bold>
                          {money(day.balance)}
                        </Text>
                      </View>
                    ))}
                </View>
              ) : null}
            </View>
          ) : (
            <Text>{s.missing}</Text>
          )
        }
      </TaskData>
    </Page>
  );
}
