import { expect, test } from 'vitest';
import { repaymentPlan, repaymentPlanMoneyLimit } from '../src';

const plan = { due: 2_480_000, reserved: 1_400_000, income: 2_750_000, expenses: 1_470_000 };

test('uses planned cash and a 20% income decrease with expenses unchanged', () => {
  expect(repaymentPlan({ ...plan, lowerIncome: false })).toEqual({
    net: 1_280_000,
    available: 2_680_000,
    difference: 200_000,
  });
  expect(repaymentPlan({ ...plan, lowerIncome: true })).toEqual({
    net: 730_000,
    available: 2_130_000,
    difference: -350_000,
  });
});

test('deducts uncovered expenses from funds and never projects negative funds for the loan', () => {
  expect(repaymentPlan({ ...plan, income: 0, lowerIncome: false })).toEqual({
    net: -1_470_000,
    available: 0,
    difference: -2_480_000,
  });
  expect(
    repaymentPlan({ due: 2, reserved: 1, income: 2, expenses: 0, lowerIncome: true }).difference,
  ).toBe(0);
});

test.each([-1, 1.5, NaN, Infinity, repaymentPlanMoneyLimit + 1])(
  'rejects invalid amount %s',
  (reserved) => {
    expect(() => repaymentPlan({ ...plan, reserved, lowerIncome: false })).toThrow(RangeError);
  },
);
