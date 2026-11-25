import {
  trackRepaymentSchema,
  repaymentPaymentUpdateSchema,
  type Payment,
} from '@finora/contracts';
import { readSchedule, repaymentLedger, trackedRepayment } from '../src/modules/repayment-model';

const days = ['2026-11-25', '2026-11-26', '2026-12-25', '2026-12-26'];
const schedule: Payment[] = days.map((day, index) => ({
  period: index + 1,
  date: day,
  principal: 10,
  interest: 1,
  payment: 11,
  balance: 30 - index * 10,
}));
const createdAt = new Date('2026-11-20T00:00:00.000Z');
const row = { id: 'ledger', simulationId: 'scenario', title: 'Khoản vay', createdAt };

describe('repayment tracking model', () => {
  it('requires explicit confirmation and rejects injected ownership data', () => {
    const input = { simulationId: '00000000-0000-4000-8000-000000000000', title: 'Ghi chú' };
    expect(trackRepaymentSchema.safeParse(input).success).toBe(false);
    expect(trackRepaymentSchema.safeParse({ ...input, confirmed: true }).success).toBe(true);
    expect(trackRepaymentSchema.safeParse({ ...input, confirmed: true, userId: 'x' }).success).toBe(
      false,
    );
    expect(repaymentPaymentUpdateSchema.safeParse({ paid: true, confirmed: false }).success).toBe(
      false,
    );
  });

  it('accepts ordered reproducible snapshots but rejects missing, unsorted or inconsistent rows', () => {
    expect(readSchedule({ schedule })).toEqual(schedule);
    expect(readSchedule({ schedule: [schedule[1], schedule[0]] })).toBe(null);
    expect(readSchedule({ schedule: [{ ...schedule[0], payment: 1337 }] })).toBe(null);
    expect(readSchedule({ schedule: [{ ...schedule[0], date: '2026-11-31' }] })).toBe(null);
  });

  it('uses Vietnam midnight, includes both ends of the 30-day reminder and never auto-pays', () => {
    const loan = trackedRepayment({ ...row, payments: [] }, schedule);
    expect(loan.paidPeriods).toBe(0);
    expect(loan.remainingPrincipal).toBe(40);
    expect(loan.remainingRepayment).toBe(44);
    const ledger = repaymentLedger([loan], new Date('2026-11-25T17:00:00.000Z'));
    expect(ledger.today).toBe('2026-11-26');
    expect(ledger.through).toBe('2026-12-25');
    expect(ledger.upcoming.map(({ period }) => period)).toEqual([2, 3]);
    expect(ledger.overdue.map(({ period }) => period)).toEqual([1]);
    expect(ledger.upcomingTotal).toBe(22);
  });

  it('uses only manual confirmations and balances unpaid schedule rows, even out of order', () => {
    const loan = trackedRepayment(
      {
        ...row,
        payments: [
          { period: 1, paid: false, updatedAt: createdAt },
          { period: 2, paid: true, updatedAt: createdAt },
        ],
      },
      schedule,
    );
    expect(loan.paidPeriods).toBe(1);
    expect(loan.schedule[1].statusChangedAt).toBe(createdAt.toISOString());
    expect(loan.remainingPrincipal).toBe(30);
    expect(loan.remainingRepayment).toBe(33);
    const result = repaymentLedger([loan], new Date('2026-11-25T17:00:00.000Z'));
    expect(result.upcoming.map(({ period }) => period)).toEqual([3]);
    expect(result.overdueTotal).toBe(11);
  });
});
