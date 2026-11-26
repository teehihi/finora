import type { DueRepayment, Profile, RepaymentLedger } from '@finora/contracts';

export function homeCashFlow(profile: Profile) {
  const remainder = profile.income - profile.expenses - profile.debt;
  const shares =
    remainder >= 0 && profile.income > 0
      ? [profile.expenses, profile.debt, remainder].map((value) => value / profile.income)
      : null;
  return { remainder, shares };
}

/**
 * The ledger's upcoming list covers only the next 30 days. Home promises the
 * next installment, so continue through the owned schedules if that list is empty.
 */
export function firstUpcomingPayment(ledger: RepaymentLedger): DueRepayment | undefined {
  if (ledger.upcoming[0]) return ledger.upcoming[0];
  let first: DueRepayment | undefined;
  for (const loan of ledger.loans) {
    for (const { date, period, payment, paid } of loan.schedule) {
      if (paid || date < ledger.today) continue;
      if (!first || date < first.date || (date === first.date && period < first.period)) {
        first = { loanId: loan.id, title: loan.title, date, period, payment };
      }
    }
  }
  return first;
}
