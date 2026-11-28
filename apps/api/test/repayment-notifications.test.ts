import type { Payment } from '@finora/contracts';
import { trackedRepayment } from '../src/modules/repayment-model';
import {
  clusteredDueKey,
  currentNotificationRows,
  isQuietHour,
  localDate,
  planNotificationRows,
  zonedHour,
} from '../src/modules/repayment-notifications';

const schedule: Payment[] = [
  {
    period: 1,
    date: '2026-12-05',
    principal: 900,
    interest: 100,
    payment: 1_000,
    balance: 0,
  },
];
const row = {
  id: 'loan',
  simulationId: 'saved',
  title: 'Private loan',
  createdAt: new Date('2026-11-20T00:00:00Z'),
  payments: [],
};

describe('persistent repayment notification policy', () => {
  it('schedules distinct due stages and overdue at 8 local without amounts', () => {
    const loan = trackedRepayment({ ...row, state: 'active' }, schedule);
    const planned = planNotificationRows([loan], 'Asia/Ho_Chi_Minh');
    expect(planned.map((item) => item.kind)).toEqual([
      'due_7',
      'due_3',
      'due_1',
      'due_today',
      'overdue',
    ]);
    expect(planned[0]).toMatchObject({
      dedupKey: 'loan:1:due_7',
      triggerDate: '2026-11-28',
      scheduledFor: new Date('2026-11-28T01:00:00.000Z'),
    });
    expect(planned[0]).not.toHaveProperty('payment');
    expect(
      planNotificationRows(
        [trackedRepayment({ ...row, state: 'planned' }, schedule)],
        'Asia/Ho_Chi_Minh',
      ),
    ).toEqual([]);
  });

  it('uses the selected timezone including a daylight saving boundary', () => {
    expect(localDate(new Date('2026-11-27T17:30:00Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-11-28');
    expect(zonedHour('2026-03-08', 8, 'America/New_York').toISOString()).toBe(
      '2026-03-08T12:00:00.000Z',
    );
  });

  it('defers optional email through wrap-around quiet hours in the user timezone', () => {
    expect(isQuietHour(new Date('2026-11-27T16:00:00Z'), 'Asia/Ho_Chi_Minh', 22, 8)).toBe(true);
    expect(isQuietHour(new Date('2026-11-28T02:00:00Z'), 'Asia/Ho_Chi_Minh', 22, 8)).toBe(false);
    expect(isQuietHour(new Date('2026-11-28T02:00:00Z'), 'Asia/Ho_Chi_Minh', 8, 17)).toBe(true);
    expect(isQuietHour(new Date('2026-11-28T02:00:00Z'), 'Asia/Ho_Chi_Minh', 8, 8)).toBe(false);
  });

  it('does not backfill missed due stages with misleading present-tense labels', () => {
    const loan = trackedRepayment({ ...row, state: 'active' }, schedule);
    const rows = planNotificationRows([loan], 'Asia/Ho_Chi_Minh');
    expect(currentNotificationRows(rows, '2026-12-06').map((item) => item.kind)).toEqual([
      'overdue',
    ]);
    expect(currentNotificationRows(rows, '2026-12-05').map((item) => item.kind)).toEqual([
      'due_today',
      'overdue',
    ]);
  });

  it('flags distinct loans due within three days in the coming week', () => {
    const first = { loanId: 'a', period: 1, date: '2026-12-05', payment: 10, title: 'A' };
    expect(
      clusteredDueKey([first, { ...first, period: 2, date: '2026-12-06' }], '2026-12-04'),
    ).toBe(null);
    expect(
      clusteredDueKey([first, { ...first, loanId: 'b', date: '2026-12-08' }], '2026-12-04'),
    ).toBe('clustered_due:a:1:b:1');
    expect(
      clusteredDueKey([first, { ...first, loanId: 'b', date: '2026-12-09' }], '2026-12-04'),
    ).toBe(null);
  });
});
