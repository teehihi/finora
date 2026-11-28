import type { RepaymentLedger } from '@finora/contracts';

export type SavedPreparationSummary = {
  loanId: string;
  period: number;
  additionalNeeded: number;
  firstShortfall: string | null;
  asOf: string;
};

export function repaymentMonitor(ledger: RepaymentLedger, plan: SavedPreparationSummary | null) {
  const next = ledger.overdue[0] ?? ledger.upcoming[0] ?? null;
  const matching =
    next && plan?.loanId === next.loanId && plan.period === next.period ? plan : null;
  const due = [...ledger.overdue, ...ledger.upcoming].sort((a, b) => a.date.localeCompare(b.date));
  const close = due.some((left, index) =>
    due.slice(index + 1).some((right) => {
      const days =
        (Date.parse(right.date + 'T00:00:00Z') - Date.parse(left.date + 'T00:00:00Z')) / 86_400_000;
      return days >= 0 && days <= 3;
    }),
  );
  const alerts: ('overdue' | 'multiple_due_close' | 'projected_shortfall')[] = [];
  if (ledger.overdue.length) alerts.push('overdue');
  if (close) alerts.push('multiple_due_close');
  if (matching?.firstShortfall) alerts.push('projected_shortfall');
  return {
    next,
    overdueCount: ledger.overdue.length,
    additionalNeeded: matching?.additionalNeeded ?? null,
    shortfallDate: matching?.firstShortfall ?? null,
    planAsOf: matching?.asOf ?? null,
    alerts,
    missing:
      next && !matching
        ? [
            'availableFunds',
            'incomeAmount',
            'incomeDay',
            'expensesAmount',
            'expensesDay',
            'reserve',
          ]
        : [],
  };
}
