import { normalizeLoanSearch, type PublicLoanProduct } from '@finora/contracts';

type Range = { min: number | null; max: number | null };
type PublishedBounds = Pick<
  PublicLoanProduct,
  'amountMin' | 'amountMax' | 'monthsMin' | 'monthsMax'
>;
type DiscoverableProduct = PublishedBounds &
  Pick<
    PublicLoanProduct,
    'category' | 'name' | 'nameEn' | 'institution' | 'purposes' | 'purposesEn'
  >;

export function withinPublishedBounds(value: number | null, { min, max }: Range) {
  return value === null || ((min === null || value >= min) && (max === null || value <= max));
}

export function hasUnknownRelevantBounds(
  product: PublishedBounds,
  amount: number | null,
  months: number | null,
) {
  return (
    (amount !== null && (product.amountMin === null || product.amountMax === null)) ||
    (months !== null && (product.monthsMin === null || product.monthsMax === null))
  );
}

export function matchesPublishedLoan(
  product: DiscoverableProduct,
  criteria: {
    category: PublicLoanProduct['category'] | 'all';
    query: string;
    amount: number | null;
    months: number | null;
  },
) {
  const haystack = normalizeLoanSearch(
    [
      product.name,
      product.nameEn,
      product.institution,
      ...product.purposes,
      ...product.purposesEn,
    ].join(' '),
  );
  return (
    (criteria.category === 'all' || product.category === criteria.category) &&
    withinPublishedBounds(criteria.amount, { min: product.amountMin, max: product.amountMax }) &&
    withinPublishedBounds(criteria.months, { min: product.monthsMin, max: product.monthsMax }) &&
    normalizeLoanSearch(criteria.query.trim())
      .split(/\s+/)
      .every((word) => haystack.includes(word))
  );
}
