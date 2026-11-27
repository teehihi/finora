import type { RepaymentLedger } from '@finora/contracts';
import { CASHFLOW_MAX_VND, type CashflowInput } from '@finora/financial-engine';

export const emptyCashflowDraft = {
  opening: '',
  income: '',
  incomeDay: '',
  expense: '',
  expenseDay: '',
};
export type CashflowDraft = typeof emptyCashflowDraft;
export type CashflowField = keyof CashflowDraft;

const readAmount = (value: string) => {
  const normalized = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+)$/.test(normalized)) {
    return NaN;
  }
  return Number(normalized.replace(/[., ]/g, ''));
};

export function cashflowInputs(draft: CashflowDraft) {
  const errors: Partial<Record<CashflowField, true>> = {};
  function amount(key: 'opening' | 'income' | 'expense') {
    const value = key !== 'opening' && !draft[key].trim() ? 0 : readAmount(draft[key]);
    if (!Number.isSafeInteger(value) || value > CASHFLOW_MAX_VND) errors[key] = true;
    return value;
  }
  function day(key: 'incomeDay' | 'expenseDay', amount: number) {
    if (amount === 0) return 1;
    const value = Number(draft[key]);
    if (!/^\d{1,2}$/.test(draft[key]) || value < 1 || value > 31) errors[key] = true;
    return value;
  }
  const opening = amount('opening');
  const income = amount('income');
  const expense = amount('expense');
  const value = {
    opening,
    income: { amount: income, day: day('incomeDay', income) },
    expense: { amount: expense, day: day('expenseDay', expense) },
  };
  return { errors, value: Object.keys(errors).length ? null : value };
}

export function paymentsFromLedger(ledger: RepaymentLedger): CashflowInput['payments'] {
  return ledger.loans.flatMap((loan) =>
    loan.schedule
      .filter((row) => !row.paid)
      .map((row) => ({
        id: loan.id + ':' + row.period,
        title: loan.title,
        date: row.date.slice(0, 10),
        amount: row.payment,
      })),
  );
}

export function demoCashflow(title: string): CashflowInput {
  return {
    start: '2026-11-24',
    opening: 800_000,
    income: { amount: 6_000_000, day: 28 },
    expense: { amount: 2_700_000, day: 10 },
    payments: ['2026-11-25', '2026-12-25', '2027-01-25'].map((date, idx) => ({
      id: 'sample-' + idx,
      date,
      amount: 2_000_000,
      title,
    })),
  };
}
