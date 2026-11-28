import assert from 'node:assert/strict';
import { compareDigitalTwin, simulate } from '../packages/financial-engine/dist/index.js';

const value = (amount) => ({ amount, source: 'user_estimate' });
const loan = {
  principal: 24_000_000,
  annualRate: 12,
  months: 12,
  method: 'annuity',
  fee: null,
  firstDue: '2026-01-31',
};
const state = {
  monthlyIncome: value(12_000_000),
  incomeStability: 'stable',
  essentialExpenses: value(5_000_000),
  discretionaryExpenses: value(1_000_000),
  existingDebtPayments: value(1_000_000),
  currentSavings: value(10_000_000),
  emergencyFund: value(8_000_000),
  events: [],
};
const scenario = {
  shocks: [
    { kind: 'unemployment', startMonth: 2, durationMonths: 3 },
    { kind: 'unexpectedExpense', startMonth: 2, amount: 4_000_000 },
  ],
};
const result = compareDigitalTwin({ state, loan, scenarios: [scenario] });
const schedule = simulate(loan).schedule;
assert.deepEqual(
  result.baseline.months.map((m) => [m.date, m.loanPayment, m.loanBalance]),
  schedule.map((m) => [m.date, m.payment, m.balance]),
);
assert.deepEqual(result, compareDigitalTwin({ state, loan, scenarios: [scenario] }));
console.log(
  JSON.stringify({
    baselineFirstPayment: schedule[0].payment,
    baselineFinalBalance: result.baseline.months.at(-1).loanBalance,
    stressedFirstShortfall: result.alternatives[0].firstCashShortfall,
    stressedPeriods: result.alternatives[0].stressedPeriods,
    reserveDepletionMonth: result.alternatives[0].reserveDepletionMonth,
    resilience: result.alternatives[0].resilience,
    unknownCosts: result.alternatives[0].unknownCosts,
  }),
);
