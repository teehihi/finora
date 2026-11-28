import type { Payment } from '@finora/contracts';
import { repaymentLedger, trackedRepayment } from '../src/modules/repayment-model';
import { repaymentMonitor } from '../src/modules/repayment-monitor';

const payment: Payment = {
  period: 1,
  date: '2026-12-01',
  principal: 900,
  interest: 100,
  payment: 1000,
  balance: 0,
};
const loan = trackedRepayment(
  {
    id: 'loan',
    simulationId: 'sim',
    title: 'QA',
    createdAt: new Date('2026-11-20Z'),
    payments: [],
  },
  [payment],
);

describe('grounded repayment monitor', () => {
  it('asks for missing preparation inputs instead of making up a cash forecast', () => {
    const ledger = repaymentLedger([loan], new Date('2026-11-27T17:00:00Z'));
    const result = repaymentMonitor(ledger, null);
    expect(result.next).toMatchObject({ payment: 1000, date: '2026-12-01' });
    expect(result.additionalNeeded).toBeNull();
    expect(result.missing).toContain('availableFunds');
  });

  it('uses a saved deterministic plan and flags close obligations', () => {
    const second = trackedRepayment(
      {
        id: 'other',
        simulationId: 'sim2',
        title: 'Other',
        createdAt: new Date('2026-11-20Z'),
        payments: [],
      },
      [{ ...payment, date: '2026-12-02' }],
    );
    const ledger = repaymentLedger([loan, second], new Date('2026-11-27T17:00:00Z'));
    const result = repaymentMonitor(ledger, {
      loanId: 'loan',
      period: 1,
      additionalNeeded: 200,
      firstShortfall: '2026-12-01',
      asOf: '2026-11-28',
    });
    expect(result.additionalNeeded).toBe(200);
    expect(result.alerts).toContain('multiple_due_close');
    expect(result.shortfallDate).toBe('2026-12-01');
  });
});
