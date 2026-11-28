import type { DueRepayment, TrackedRepayment } from '@finora/contracts';

export type NotificationKind =
  | 'due_7'
  | 'due_3'
  | 'due_1'
  | 'due_today'
  | 'overdue'
  | 'projected_shortfall'
  | 'low_reserve'
  | 'clustered_due'
  | 'profile_review';
export type PlannedNotification = {
  repaymentId: string | null;
  period: number | null;
  kind: NotificationKind;
  dedupKey: string;
  triggerDate: string;
  scheduledFor: Date;
};

function parts(date: Date, timeZone: string) {
  const entries = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(entries.map(({ type, value }) => [type, Number(value)])) as Record<
    string,
    number
  >;
}

export function localDate(now: Date, timeZone: string) {
  const value = parts(now, timeZone);
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

export function isQuietHour(now: Date, timeZone: string, start: number, end: number) {
  if (start === end) return false;
  const hour = parts(now, timeZone).hour;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function zonedHour(day: string, hour: number, timeZone: string) {
  const target = Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00Z`);
  if (!Number.isFinite(target)) throw new RangeError('Invalid notification day');
  let guess = target;
  for (let index = 0; index < 3; index++) {
    const actual = parts(new Date(guess), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    guess += target - actualAsUtc;
  }
  return new Date(guess);
}

const shift = (day: string, days: number) => {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export function planNotificationRows(
  loans: TrackedRepayment[],
  timeZone: string,
): PlannedNotification[] {
  const offsets = [
    ['due_7', -7],
    ['due_3', -3],
    ['due_1', -1],
    ['due_today', 0],
    ['overdue', 1],
  ] as const;
  return loans
    .filter((loan) => loan.state === 'active')
    .flatMap((loan) =>
      loan.schedule
        .filter((row) => !row.paid)
        .flatMap((row) =>
          offsets.map(([kind, offset]) => {
            const triggerDate = shift(row.date, offset);
            return {
              repaymentId: loan.id,
              period: row.period,
              kind,
              dedupKey: `${loan.id}:${row.period}:${kind}`,
              triggerDate,
              scheduledFor: zonedHour(triggerDate, 8, timeZone),
            };
          }),
        ),
    );
}

export function currentNotificationRows(rows: PlannedNotification[], today: string) {
  const earliestOverdue = shift(today, -30);
  const latest = shift(today, 30);
  return rows.filter(
    (row) =>
      row.triggerDate <= latest &&
      (row.kind === 'overdue' ? row.triggerDate >= earliestOverdue : row.triggerDate >= today),
  );
}

export function clusteredDueKey(upcoming: DueRepayment[], today: string): string | null {
  const nearby = upcoming.filter((row) => row.date >= today && row.date <= shift(today, 7));
  for (let i = 0; i < nearby.length; i++)
    for (let j = i + 1; j < nearby.length; j++) {
      const first = nearby[i];
      const second = nearby[j];
      if (first.loanId !== second.loanId && second.date <= shift(first.date, 3))
        return `clustered_due:${first.loanId}:${first.period}:${second.loanId}:${second.period}`;
    }
  return null;
}
