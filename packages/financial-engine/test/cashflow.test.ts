import { describe, expect, it } from 'vitest';
import { projectCashflow, type CashflowInput } from '../src';

function fixture(overrides: Partial<CashflowInput> = {}): CashflowInput {
  return {
    start: '2026-11-24',
    opening: 800_000,
    income: { amount: 6_000_000, day: 28 },
    expense: { amount: 0, day: 1 },
    payments: [{ id: 'one', title: 'QA', date: '2026-11-25', amount: 2_000_000 }],
    ...overrides,
  };
}

describe('90-day daily cash flow', () => {
  it('calculates the first shortfall, lowest balance, recovery and cash needed', () => {
    const input = fixture();
    const base = projectCashflow(input);
    expect(base.days).toHaveLength(90);
    expect(base.days.at(-1)?.date).toBe('2027-02-21');
    expect(base.firstShortfall).toMatchObject({ date: '2026-11-25', balance: -1_200_000 });
    expect(base.lowest).toBe(base.firstShortfall);
    expect(base.recovery?.date).toBe('2026-11-28');
    expect(base.shortfallDays).toBe(3);
    expect(base.bufferNeeded).toBe(1_200_000);
    const buffered = projectCashflow(input, base.bufferNeeded);
    expect(buffered.shortfallDays).toBe(0);
    expect(buffered.lowest.balance).toBe(0);
    expect(buffered.days.map((day) => day.events)).toEqual(base.days.map((day) => day.events));
    expect(projectCashflow(input)).toEqual(base);
  });

  it('clamps repeat days at month-end including leap days and never drifts', () => {
    const { days } = projectCashflow(
      fixture({
        start: '2028-01-31',
        income: { amount: 100, day: 31 },
        payments: [],
      }),
    );
    expect(days.filter((day) => day.events.length > 0).map((day) => day.date)).toEqual([
      '2028-01-31',
      '2028-02-29',
      '2028-03-31',
    ]);
  });

  it('nets same-day activity, brings overdue forward, and excludes out-of-horizon payments', () => {
    const result = projectCashflow(
      fixture({
        opening: 0,
        income: { amount: 500, day: 24 },
        expense: { amount: 100, day: 24 },
        payments: [
          { id: 'old', title: 'Old', date: '2026-10-01', amount: 250 },
          { id: 'same', title: 'Same', date: '2026-11-24', amount: 150 },
          { id: 'end', title: 'End', date: '2027-02-21', amount: 1_500 },
          { id: 'late', title: 'Late', date: '2027-02-22', amount: 9_000 },
        ],
      }),
    );
    expect(result.days[0]?.balance).toBe(0);
    expect(result.days[0]?.events).toContainEqual(
      expect.objectContaining({ id: 'old', due: '2026-10-01' }),
    );
    expect(result.shortfallDays).toBe(1);
    expect(result.recovery).toBeUndefined();
    expect(result.firstShortfall?.date).toBe('2027-02-21');
    expect(result.bufferNeeded).toBe(700);
    expect(result.days.flatMap(({ events }) => events).some(({ id }) => id === 'late')).toBe(false);
  });

  it('handles all-zero or empty inputs and rejects invalid dates, cash and monthly days', () => {
    const input = fixture({ opening: 0, payments: [], income: { amount: 0, day: 1 } });
    expect(projectCashflow(input)).toMatchObject({ shortfallDays: 0, bufferNeeded: 0 });
    expect(() => projectCashflow({ ...input, start: '2026-02-30' })).toThrow(RangeError);
    expect(() => projectCashflow({ ...input, opening: -1 })).toThrow(RangeError);
    expect(() => projectCashflow({ ...input, income: { amount: 100, day: 32 } })).toThrow(
      RangeError,
    );
  });

  it('includes dated planned expenses without treating them as loan payments', () => {
    const result = projectCashflow(
      fixture({
        opening: 500,
        income: { amount: 0, day: 1 },
        payments: [],
        oneOffExpenses: [{ id: 'school', title: 'School', date: '2026-11-25', amount: 700 }],
      }),
    );
    expect(result.firstShortfall?.date).toBe('2026-11-25');
    expect(result.days[1]?.events).toContainEqual(
      expect.objectContaining({ kind: 'expense', id: 'school', amount: -700 }),
    );
  });
});
