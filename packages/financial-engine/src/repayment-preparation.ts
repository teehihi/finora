import { projectCashflow, type CashflowInput } from './cashflow';

export function prepareRepayment(input: CashflowInput, targetId: string, reserve: number) {
  if (!Number.isSafeInteger(reserve) || reserve < 0 || reserve > 1_000_000_000_000)
    throw new RangeError('Invalid reserve');
  const target = input.payments.find((row) => row.id === targetId);
  if (!target || target.date < input.start) throw new RangeError('Target payment unavailable');
  const projection = projectCashflow(input);
  const due = projection.days.find((row) => row.date === target.date);
  if (!due) throw new RangeError('Target payment outside projection');
  const additionalNeeded = Math.max(0, reserve - due.balance);
  const days = Math.max(
    1,
    Math.round(
      (Date.parse(target.date + 'T00:00:00Z') - Date.parse(input.start + 'T00:00:00Z')) /
        86_400_000,
    ),
  );
  return {
    dueDate: target.date,
    targetAmount: target.amount,
    balanceAfterDue: due.balance,
    requiredReserve: reserve,
    additionalNeeded,
    dailyGoal: Math.ceil(additionalNeeded / days),
    weeklyGoal: Math.ceil(additionalNeeded / Math.ceil(days / 7)),
    firstShortfall: projection.firstShortfall?.date ?? null,
    shortfallDays: projection.shortfallDays,
    lowestBalance: projection.lowest.balance,
    days: projection.days,
  };
}
