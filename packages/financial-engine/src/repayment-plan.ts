import Decimal from 'decimal.js';

export const repaymentPlanMoneyLimit = 999_999_999_999;

export function repaymentPlan(input: {
  due: number;
  reserved: number;
  income: number;
  expenses: number;
  lowerIncome: boolean;
}) {
  const { due, reserved, income, expenses, lowerIncome } = input;
  if (
    !Number.isSafeInteger(due) ||
    due < 0 ||
    [reserved, income, expenses].some(
      (v) => !Number.isSafeInteger(v) || v < 0 || v > repaymentPlanMoneyLimit,
    )
  ) {
    throw new RangeError('Invalid repayment plan amount');
  }
  const expectedIncome = new Decimal(income).times(lowerIncome ? 0.8 : 1).floor();
  const net = expectedIncome.minus(expenses);
  const available = Decimal.max(0, net.plus(reserved));
  return {
    net: net.toNumber(),
    available: available.toNumber(),
    difference: available.minus(due).toNumber(),
  };
}
