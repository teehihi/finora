import type { RepaymentLedger, TrackedRepayment } from '@finora/contracts';
import { firstUpcomingPayment, homeCashFlow } from '../src/features/home-model';

const ledger: RepaymentLedger = {
  today: '2026-11-26',
  through: '2026-12-25',
  loans: [],
  overdue: [],
  overdueTotal: 0,
  upcoming: [],
  upcomingTotal: 0,
};

function loan(id: string, date: string, paid = false): TrackedRepayment {
  return {
    id,
    simulationId: 'simulation-' + id,
    title: id,
    createdAt: '2026-11-24',
    paidPeriods: paid ? 1 : 0,
    remainingPrincipal: paid ? 0 : 800_000,
    remainingRepayment: paid ? 0 : 850_000,
    schedule: [
      {
        date,
        period: 1,
        payment: 850_000,
        principal: 800_000,
        interest: 50_000,
        balance: 0,
        statusChangedAt: null,
        paid,
      },
    ],
  };
}

test('keeps profile cash remaining different from available repayment capacity', () => {
  const flow = homeCashFlow({ income: 15_000_000, expenses: 8_000_000, debt: 1_000_000 });
  expect(flow.remainder).toBe(6_000_000);
  expect(flow.shares).toEqual([8 / 15, 1 / 15, 6 / 15]);
});

test('does not draw an income allocation chart when expenses and debt exceed income', () => {
  expect(homeCashFlow({ income: 15_000_000, expenses: 16_000_000, debt: 1_000_000 })).toEqual({
    remainder: -2_000_000,
    shares: null,
  });
  expect(homeCashFlow({ income: 15, expenses: 8, debt: 7 })).toEqual({
    remainder: 0,
    shares: [8 / 15, 7 / 15, 0],
  });
});

test('honors the next installment provided within the ledger window', () => {
  const scheduled = { date: '2026-12-01', period: 3, payment: 120_000, loanId: 'x', title: 'X' };
  expect(firstUpcomingPayment({ ...ledger, upcoming: [scheduled] })).toEqual(scheduled);
});

test('finds the next unpaid obligation beyond the 30-day window', () => {
  const loans = [
    loan('later', '2027-02-06'),
    loan('paid', '2026-12-29', true),
    loan('overdue', '2026-11-15'),
    loan('earliest', '2027-01-02'),
  ];
  expect(firstUpcomingPayment({ ...ledger, loans })).toEqual({
    date: '2027-01-02',
    loanId: 'earliest',
    title: 'earliest',
    period: 1,
    payment: 850_000,
  });
  expect(firstUpcomingPayment({ ...ledger, loans: loans.slice(1, 3) })).toBeUndefined();
});
