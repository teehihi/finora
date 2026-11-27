import Decimal from 'decimal.js';
import {
  loanSchema,
  profileSchema,
  type LoanInput,
  type Estimate,
  type Profile,
  type Payment,
} from '@finora/contracts';

const D = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });
const dong = (n: Decimal) => n.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
function dueDate(anchor: string, index: number) {
  const [year, month, day] = anchor.split('-').map(Number);
  const end = new Date(Date.UTC(year, month + index, 0));
  end.setUTCDate(Math.min(day, end.getUTCDate()));
  return end.toISOString().slice(0, 10);
}

export function simulate(raw: LoanInput): Estimate {
  const input = loanSchema.parse(raw);
  const principal = new D(input.principal),
    rate = new D(input.annualRate).div(1200);
  const equalPrincipal = dong(principal.div(input.months));
  const installment = rate.isZero()
    ? equalPrincipal
    : dong(principal.times(rate).div(new D(1).minus(new D(1).plus(rate).pow(-input.months))));
  let balance = principal,
    interestSum = new D(0);
  const schedule: Payment[] = [];
  for (let i = 0; i < input.months; i++) {
    const interest = dong((input.method === 'flat' ? principal : balance).times(rate));
    const planned = input.method === 'annuity' ? installment.minus(interest) : equalPrincipal;
    const paid = i === input.months - 1 ? balance : D.min(balance, D.max(0, planned));
    balance = balance.minus(paid);
    interestSum = interestSum.plus(interest);
    schedule.push({
      period: i + 1,
      date: dueDate(input.firstDue, i),
      principal: paid.toNumber(),
      interest: interest.toNumber(),
      payment: paid.plus(interest).toNumber(),
      balance: balance.toNumber(),
    });
  }
  const repayment = principal.plus(interestSum);
  return {
    schedule,
    firstPayment: schedule[0].payment,
    interest: interestSum.toNumber(),
    repayment: repayment.toNumber(),
    total: input.fee === null ? null : repayment.plus(input.fee).toNumber(),
  };
}
export function affordability(raw: Profile, target = 0.35) {
  const p = profileSchema.parse(raw);
  if (!Number.isFinite(target) || target < 0 || target > 1)
    throw new RangeError('Invalid scenario ratio');
  const income = new D(p.income);
  return {
    debtToIncome: new D(p.debt).div(income).times(100).toDecimalPlaces(2).toNumber(),
    monthlyBudget: D.max(
      0,
      D.min(income.times(target).minus(p.debt), income.minus(p.expenses).minus(p.debt)),
    )
      .floor()
      .toNumber(),
    target,
  };
}
export function compare(a: LoanInput, b: LoanInput) {
  const left = simulate(a),
    right = simulate(b);
  return {
    left,
    right,
    totalDifference:
      left.total === null || right.total === null
        ? null
        : new D(left.total).minus(right.total).toNumber(),
  };
}

export { repaymentPlan, repaymentPlanMoneyLimit } from './repayment-plan';

export * from './cashflow';
export * from './matching';
export * from './digital-twin';
