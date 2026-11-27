import type { RepaymentLedger } from '@finora/contracts';
import {
  cashflowInputs,
  emptyCashflowDraft,
  paymentsFromLedger,
} from '../src/features/cashflow-model';

test('editing requires an opening amount and refuses decimals, mixed groups, signs and impossible days', () => {
  expect(cashflowInputs(emptyCashflowDraft).errors).toEqual({ opening: true });
  expect(
    cashflowInputs({
      ...emptyCashflowDraft,
      opening: '1.000.000',
      income: '12,000,000',
      incomeDay: '31',
      expense: '300 000',
      expenseDay: '5',
    }).value,
  ).toEqual({
    opening: 1_000_000,
    income: { amount: 12_000_000, day: 31 },
    expense: { amount: 300_000, day: 5 },
  });
  for (const opening of ['-200', '1.25', '1,000.000', '1e6', '1000000000001']) {
    expect(cashflowInputs({ ...emptyCashflowDraft, opening }).errors.opening).toBe(true);
  }
  expect(
    cashflowInputs({ ...emptyCashflowDraft, opening: '0', income: '1', incomeDay: '32' }).errors,
  ).toEqual({ incomeDay: true });
});

test('projects the full tracked schedule rather than the short upcoming list, but excludes paid entries', () => {
  const payment = {
    period: 1,
    principal: 100,
    interest: 20,
    payment: 120,
    balance: 300,
    paid: false,
    statusChangedAt: null,
  };
  const ledger: RepaymentLedger = {
    today: '2026-11-25',
    through: '2026-12-25',
    overdue: [],
    upcoming: [],
    upcomingTotal: 0,
    overdueTotal: 0,
    loans: [
      {
        id: 'loan',
        simulationId: 'test',
        title: 'QA',
        createdAt: '',
        paidPeriods: 1,
        remainingPrincipal: 100,
        remainingRepayment: 120,
        schedule: [
          { ...payment, date: '2026-12-25', paid: true },
          { ...payment, date: '2027-01-25', period: 2 },
        ],
      },
    ],
  };
  expect(paymentsFromLedger(ledger)).toEqual([
    { id: 'loan:2', title: 'QA', date: '2027-01-25', amount: 120 },
  ]);
});
