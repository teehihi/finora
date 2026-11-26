import type { PublicLoanProduct } from '@finora/contracts';

type PublishedCostTerms = Pick<
  PublicLoanProduct,
  'rate' | 'fee' | 'amountMin' | 'amountMax' | 'monthsMin' | 'monthsMax'
>;

export function publishedComparisonReasons(left: PublishedCostTerms, right: PublishedCostTerms) {
  const reasons: ('fees' | 'rate' | 'ranges' | 'personal')[] = [];
  if (left.fee === null || right.fee === null) reasons.push('fees');
  const a = left.rate;
  const b = right.rate;
  if (
    !a ||
    !b ||
    a.period !== b.period ||
    a.basis === 'unknown' ||
    b.basis === 'unknown' ||
    a.basis !== b.basis
  ) {
    reasons.push('rate');
  }
  const overlaps = (
    aMin: number | null,
    aMax: number | null,
    bMin: number | null,
    bMax: number | null,
  ) =>
    (aMax === null || bMin === null || aMax >= bMin) &&
    (bMax === null || aMin === null || bMax >= aMin);
  if (
    !overlaps(left.amountMin, left.amountMax, right.amountMin, right.amountMax) ||
    !overlaps(left.monthsMin, left.monthsMax, right.monthsMin, right.monthsMax)
  ) {
    reasons.push('ranges');
  }
  // Even the same disclosed basis with known fees is not personalized.
  reasons.push('personal');
  return reasons;
}
