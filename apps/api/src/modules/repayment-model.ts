import { z } from 'zod';
import {
  zone,
  type DueRepayment,
  type Payment,
  type RepaymentLedger,
  type TrackedRepayment,
} from '@finora/contracts';

const dong = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const scheduleSchema = z
  .array(
    z.object({
      period: z.number().int().min(1).max(360),
      date: z.iso.date(),
      principal: dong,
      interest: dong,
      payment: dong,
      balance: dong,
    }),
  )
  .min(1)
  .max(360);

export function readSchedule(result: unknown): Payment[] | null {
  const raw =
    result && typeof result === 'object' && 'schedule' in result ? result.schedule : undefined;
  const value = scheduleSchema.safeParse(raw);
  if (!value.success) return null;
  const rows = value.data;
  return rows.every(
    (row, index) =>
      row.period === index + 1 &&
      row.payment === row.principal + row.interest &&
      (index === 0 || rows[index - 1].date < row.date),
  )
    ? rows
    : null;
}

type Row = {
  id: string;
  simulationId: string;
  title: string;
  createdAt: Date;
  payments: { period: number; paid: boolean; updatedAt: Date }[];
};
export function trackedRepayment(row: Row, schedule: Payment[]): TrackedRepayment {
  const statuses = new Map(row.payments.map((payment) => [payment.period, payment]));
  const tracked = schedule.map((payment) => {
    const status = statuses.get(payment.period);
    return {
      ...payment,
      paid: status?.paid ?? false,
      statusChangedAt: status?.updatedAt.toISOString() ?? null,
    };
  });
  const open = tracked.filter(({ paid }) => !paid);
  return {
    id: row.id,
    simulationId: row.simulationId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    paidPeriods: tracked.length - open.length,
    remainingPrincipal: open.reduce((total, payment) => total + payment.principal, 0),
    remainingRepayment: open.reduce((total, payment) => total + payment.payment, 0),
    schedule: tracked,
  };
}

const localDay = (now: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export function repaymentLedger(loans: TrackedRepayment[], now = new Date()): RepaymentLedger {
  const today = localDay(now);
  const end = new Date(today + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 29);
  const through = end.toISOString().slice(0, 10);
  const due = loans
    .flatMap((loan) =>
      loan.schedule
        .filter(({ paid, date }) => !paid && date <= through)
        .map(({ payment, date, period }): DueRepayment => ({
          loanId: loan.id,
          title: loan.title,
          payment,
          date,
          period,
        })),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
  const overdue = due.filter(({ date }) => date < today);
  const upcoming = due.filter(({ date }) => date >= today);
  const sum = (items: DueRepayment[]) => items.reduce((total, row) => total + row.payment, 0);
  return {
    today,
    through,
    upcoming,
    overdue,
    upcomingTotal: sum(upcoming),
    overdueTotal: sum(overdue),
    loans,
  };
}
