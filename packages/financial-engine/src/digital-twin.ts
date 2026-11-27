import Decimal from 'decimal.js';
import {
  twinComparisonRequestSchema,
  twinProjectionRequestSchema,
  twinProjectionSchema,
  type TwinComparison,
  type TwinComparisonRequest,
  type TwinProjection,
  type TwinProjectionRequest,
  type TwinScenario,
  type TwinState,
  type LoanInput,
  type Payment,
} from '@finora/contracts';
import { simulate } from './index';

const D = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });
const whole = (value: Decimal.Value) => new D(value).toDecimalPlaces(0, D.ROUND_HALF_UP).toNumber();
const capMoney = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000)
    throw new RangeError('Projected monthly amount outside supported range');
  return value;
};
const defaultThresholds = { stressedDebtToIncomePercent: 50, requiredEmergencyMonths: 3 };
const active = (month: number, start: number, duration: number) =>
  month >= start && month < start + duration;

function budgetForMonth(state: TwinState, scenario: TwinScenario, month: number) {
  let income = new D(state.monthlyIncome!.amount);
  let essential = new D(state.essentialExpenses!.amount);
  let discretionary = new D(state.discretionaryExpenses!.amount);
  let debt = new D(state.existingDebtPayments!.amount);
  for (const event of state.events) {
    if (!active(month, event.startMonth, event.durationMonths)) continue;
    const change = new D(event.change);
    if (event.kind === 'income') income = income.plus(change);
    else if (event.kind === 'essentialExpense') essential = essential.plus(change);
    else if (event.kind === 'discretionaryExpense') discretionary = discretionary.plus(change);
    else debt = debt.plus(change);
  }
  for (const shock of scenario.shocks) {
    if (shock.kind === 'earlyRepayment') continue;
    if (shock.kind === 'unexpectedExpense') {
      if (shock.startMonth === month) essential = essential.plus(shock.amount);
      continue;
    }
    if (!active(month, shock.startMonth, shock.durationMonths)) continue;
    if (shock.kind === 'incomeReduction')
      income = income.times(new D(100).minus(shock.percent)).div(100);
    if (shock.kind === 'unemployment') income = new D(0);
    if (shock.kind === 'expenseInflation') {
      const factor = new D(1).plus(new D(shock.percent).div(100)).pow(month - shock.startMonth + 1);
      essential = essential.times(factor);
      discretionary = discretionary.times(factor);
    }
    if (shock.kind === 'additionalDebt') debt = debt.plus(shock.monthlyPayment);
  }
  return {
    income: capMoney(whole(income)),
    essentialExpenses: capMoney(whole(essential)),
    discretionaryExpenses: capMoney(whole(discretionary)),
    existingDebtPayments: capMoney(whole(debt)),
  };
}

function scheduleWithEarlyRepayment(loan: LoanInput, scenario: TwinScenario) {
  const original = simulate(loan).schedule;
  const rows: Payment[] = [...original];
  const fees = new Map<number, number>();
  let hypothetical = false;
  let unknownFee = false;
  const early = scenario.shocks
    .filter((s) => s.kind === 'earlyRepayment')
    .sort((a, b) => a.startMonth - b.startMonth);
  for (const shock of early) {
    if (shock.startMonth > loan.months) continue;
    hypothetical = true;
    const i = shock.startMonth - 1;
    const current = rows[i];
    if (!current || current.balance === 0) continue;
    const extra = Math.min(shock.amount, current.balance);
    const balance = current.balance - extra;
    const fee = shock.fee ?? 0;
    if (shock.fee === null) unknownFee = true;
    fees.set(shock.startMonth, (fees.get(shock.startMonth) ?? 0) + fee);
    rows[i] = {
      ...current,
      principal: current.principal + extra,
      payment: current.payment + extra + fee,
      balance,
    };
    if (i + 1 >= loan.months) continue;
    if (balance === 0) {
      for (let j = i + 1; j < loan.months; j++)
        rows[j] = { ...rows[j], principal: 0, interest: 0, payment: 0, balance: 0 };
    } else {
      // Reamortization is explicitly hypothetical; no lender policy is inferred.
      const remaining = simulate({
        ...loan,
        principal: balance,
        months: loan.months - i - 1,
        firstDue: original[i + 1].date,
      }).schedule;
      for (let j = i + 1; j < loan.months; j++)
        rows[j] = { ...remaining[j - i - 1], period: j + 1, date: original[j].date };
    }
  }
  return { rows, hypothetical, unknownFee, fees };
}

export function projectDigitalTwin(raw: TwinProjectionRequest): TwinProjection {
  const {
    state,
    loan: originalLoan,
    scenario,
    thresholds = defaultThresholds,
  } = twinProjectionRequestSchema.parse(raw);
  const loan = { ...originalLoan, ...scenario.alternativeLoan };
  if (scenario.shocks.some((shock) => shock.startMonth > loan.months))
    throw new RangeError('Scenario starts after the proposed loan term');
  const required = [
    'monthlyIncome',
    'essentialExpenses',
    'discretionaryExpenses',
    'existingDebtPayments',
  ] as const;
  const missing = [
    ...required.filter((key) => state[key] === null),
    ...(['currentSavings', 'emergencyFund'] as const).filter((key) => state[key] === null),
    ...(state.incomeStability === null || state.incomeStability === 'unknown'
      ? ['incomeStability']
      : []),
  ];
  const unknownCosts = [
    ...(loan.fee === null ? ['origination_fee'] : []),
    ...(scenario.shocks.some((s) => s.kind === 'earlyRepayment' && s.fee === null)
      ? ['early_repayment_fee']
      : []),
  ];
  const base = {
    missing,
    thresholds,
    unknownCosts,
    provenance: {
      monthlyIncome: state.monthlyIncome?.source ?? null,
      essentialExpenses: state.essentialExpenses?.source ?? null,
      discretionaryExpenses: state.discretionaryExpenses?.source ?? null,
      existingDebtPayments: state.existingDebtPayments?.source ?? null,
      currentSavings: state.currentSavings?.source ?? null,
      emergencyFund: state.emergencyFund?.source ?? null,
      events: state.events.map((event) => event.source),
    },
    hypotheticalEarlyRepayment: scenario.shocks.some((s) => s.kind === 'earlyRepayment'),
    assumptions: [
      'scenario_not_forecast',
      'loan_terms_user_assumption',
      'new_loan_disbursement_excluded',
      ...(scenario.shocks.some((s) => s.kind === 'earlyRepayment')
        ? ['early_repayment_policy_unverified']
        : []),
      ...(scenario.alternativeLoan ? ['alternative_loan_terms_assumed'] : []),
    ],
  };
  if (required.some((key) => state[key] === null))
    return twinProjectionSchema.parse({
      ...base,
      status: 'incomplete',
      months: [],
      firstCashShortfall: null,
      stressedPeriods: 0,
      reserveDepletionMonth: null,
      recoveryMonth: null,
      resilience: 'insufficient_data',
      resilienceReasons: ['core_budget_missing'],
      totalKnownLoanPayments: null,
    });
  const { rows } = scheduleWithEarlyRepayment(loan, scenario);
  let savings: Decimal | null =
    state.currentSavings === null ? null : new D(state.currentSavings.amount);
  const nonReserve =
    state.currentSavings && state.emergencyFund
      ? D.max(0, new D(state.currentSavings.amount).minus(state.emergencyFund.amount))
      : null;
  let firstCashShortfall: number | null = null;
  let reserveDepletionMonth: number | null = null;
  let recoveryMonth: number | null = null;
  let stressedPeriods = 0;
  const months = rows.map((schedule, index) => {
    const period = index + 1;
    const budget = budgetForMonth(state, scenario, period);
    const net = new D(budget.income)
      .minus(budget.essentialExpenses)
      .minus(budget.discretionaryExpenses)
      .minus(budget.existingDebtPayments)
      .minus(schedule.payment);
    savings = savings === null ? null : savings.plus(net);
    const mandatory = budget.essentialExpenses + budget.existingDebtPayments + schedule.payment;
    const reserve =
      savings === null || nonReserve === null || state.emergencyFund === null
        ? null
        : D.max(0, D.min(state.emergencyFund.amount, savings.minus(nonReserve)));
    const coverage =
      reserve === null
        ? null
        : mandatory === 0
          ? null
          : reserve.div(mandatory).toDecimalPlaces(2).toNumber();
    const dti =
      budget.income === 0
        ? null
        : new D(budget.existingDebtPayments)
            .plus(schedule.payment)
            .div(budget.income)
            .times(100)
            .toDecimalPlaces(2)
            .toNumber();
    const shortfall = net.isNegative();
    const stressed =
      shortfall ||
      (budget.income === 0 && mandatory > 0) ||
      (dti !== null && dti > thresholds.stressedDebtToIncomePercent);
    if (shortfall && firstCashShortfall === null) firstCashShortfall = period;
    if (stressed) stressedPeriods++;
    if (
      state.emergencyFund?.amount &&
      reserve !== null &&
      reserve.isZero() &&
      reserveDepletionMonth === null
    )
      reserveDepletionMonth = period;
    if (
      firstCashShortfall !== null &&
      recoveryMonth === null &&
      period > firstCashShortfall &&
      !stressed &&
      savings !== null &&
      savings.greaterThanOrEqualTo(0)
    )
      recoveryMonth = period;
    return {
      period,
      date: schedule.date,
      ...budget,
      loanPayment: schedule.payment,
      netCashFlow: net.toNumber(),
      accumulatedSavings: savings?.toNumber() ?? null,
      loanBalance: schedule.balance,
      debtToIncomePercent: dti,
      emergencyCoverageMonths: coverage,
      cashShortfall: shortfall,
      stressed,
    };
  });
  const lowReserve = months.some(
    (row) =>
      row.emergencyCoverageMonths !== null &&
      row.emergencyCoverageMonths < thresholds.requiredEmergencyMonths,
  );
  const unsustainable = months.some(
    (row) => row.accumulatedSavings !== null && row.accumulatedSavings < 0,
  );
  const reasons = [
    ...(firstCashShortfall !== null ? ['negative_monthly_cash_flow'] : []),
    ...(reserveDepletionMonth !== null ? ['emergency_reserve_depleted'] : []),
    ...(stressedPeriods > 0 ? ['repayment_pressure'] : []),
    ...(lowReserve ? ['reserve_below_threshold'] : []),
    ...(missing.length > 0 ? ['incomplete_state'] : []),
  ];
  const resilience = unsustainable
    ? 'unsustainable'
    : stressedPeriods > 0 || lowReserve || reserveDepletionMonth !== null
      ? 'pressured'
      : missing.length > 0
        ? 'insufficient_data'
        : 'resilient';
  const totalKnownLoanPayments = rows
    .reduce((sum, row) => sum.plus(row.payment), new D(loan.fee ?? 0))
    .toNumber();
  return twinProjectionSchema.parse({
    ...base,
    status: 'projected',
    months,
    firstCashShortfall,
    stressedPeriods,
    reserveDepletionMonth,
    recoveryMonth,
    resilience,
    resilienceReasons: reasons,
    totalKnownLoanPayments,
  });
}

export function compareDigitalTwin(raw: TwinComparisonRequest): TwinComparison {
  const { state, loan, scenarios, thresholds } = twinComparisonRequestSchema.parse(raw);
  return {
    baseline: projectDigitalTwin({ state, loan, scenario: { shocks: [] }, thresholds }),
    alternatives: scenarios.map((scenario) =>
      projectDigitalTwin({ state, loan, scenario, thresholds }),
    ),
  };
}
