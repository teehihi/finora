export const CASHFLOW_DAYS = 90;
export const CASHFLOW_MAX_VND = 1_000_000_000_000;
const dayMs = 86_400_000;

export interface MonthlyCashMovement {
  amount: number;
  day: number;
}

export interface CashflowPayment {
  id: string;
  title: string;
  date: string;
  amount: number;
}

export interface CashflowInput {
  start: string;
  opening: number;
  income: MonthlyCashMovement;
  expense: MonthlyCashMovement;
  payments: CashflowPayment[];
  oneOffExpenses?: { id: string; title: string; date: string; amount: number }[];
}

export type CashflowEvent = {
  id: string;
  date: string;
  amount: number;
} & ({ kind: 'income' | 'expense' } | { kind: 'repayment'; title: string; due: string });

export interface CashflowDay {
  date: string;
  balance: number;
  events: CashflowEvent[];
}

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Invalid cashflow date');
  const day = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value) {
    throw new RangeError('Invalid cashflow date');
  }
  return day;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, count: number) => new Date(date.getTime() + count * dayMs);
const validAmount = (amount: number) =>
  Number.isSafeInteger(amount) && amount >= 0 && amount <= CASHFLOW_MAX_VND;

export function projectCashflow(input: CashflowInput, extraOpening = 0) {
  const start = calendarDate(input.start);
  const end = isoDay(addDays(start, CASHFLOW_DAYS - 1));
  const events = new Map<string, CashflowEvent[]>();
  const add = (event: CashflowEvent) => {
    const current = events.get(event.date);
    if (current) current.push(event);
    else events.set(event.date, [event]);
  };
  if (!validAmount(input.opening) || !Number.isSafeInteger(extraOpening) || extraOpening < 0) {
    throw new RangeError('Invalid opening balance');
  }
  for (const [kind, { amount, day }] of [
    ['income', input.income],
    ['expense', input.expense],
  ] as const) {
    if (!validAmount(amount) || !Number.isInteger(day) || day < 1 || day > 31) {
      throw new RangeError('Invalid monthly cash flow');
    }
    if (!amount) continue;
    // Walk each calendar day to avoid local time zones, overflow and month-end drift.
    for (let offset = 0; offset < CASHFLOW_DAYS; offset++) {
      const cursor = addDays(start, offset);
      const dayOfMonth = cursor.getUTCDate();
      const lastOfMonth = addDays(cursor, 1).getUTCDate() === 1;
      if (dayOfMonth !== day && !(lastOfMonth && dayOfMonth < day)) continue;
      const date = isoDay(cursor);
      add({ date, kind, id: kind + date, amount: kind === 'income' ? amount : -amount });
    }
  }
  for (const payment of input.payments) {
    calendarDate(payment.date);
    if (!Number.isSafeInteger(payment.amount) || payment.amount < 0) {
      throw new RangeError('Invalid payment');
    }
    if (!payment.amount || payment.date > end) continue;
    const date = payment.date < input.start ? input.start : payment.date;
    add({
      date,
      due: payment.date,
      kind: 'repayment',
      id: payment.id,
      title: payment.title,
      amount: -payment.amount,
    });
  }
  for (const expense of input.oneOffExpenses ?? []) {
    calendarDate(expense.date);
    if (!validAmount(expense.amount)) throw new RangeError('Invalid planned expense');
    if (!expense.amount || expense.date > end) continue;
    add({
      kind: 'expense',
      id: expense.id,
      date: expense.date < input.start ? input.start : expense.date,
      amount: -expense.amount,
    });
  }
  let balance = BigInt(input.opening) + BigInt(extraOpening);
  const days: CashflowDay[] = [];
  for (let offset = 0; offset < CASHFLOW_DAYS; offset++) {
    const date = isoDay(addDays(start, offset));
    const movements = events.get(date) ?? [];
    balance += movements.reduce((net, event) => net + BigInt(event.amount), 0n);
    const vnd = Number(balance);
    if (!Number.isSafeInteger(vnd)) throw new RangeError('Cashflow balance out of range');
    days.push({ date, events: movements, balance: vnd });
  }
  const lowest = days.reduce((low, day) => (day.balance < low.balance ? day : low));
  const firstShortfall = days.find((day) => day.balance < 0);
  const recovery =
    firstShortfall && days.find((day) => day.date > firstShortfall.date && day.balance >= 0);
  return {
    days,
    lowest,
    firstShortfall,
    recovery,
    shortfallDays: days.filter((day) => day.balance < 0).length,
    bufferNeeded: lowest.balance < 0 ? -lowest.balance : 0,
  };
}
