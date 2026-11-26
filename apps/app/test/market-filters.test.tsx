import {
  hasUnknownRelevantBounds,
  matchesPublishedLoan,
  withinPublishedBounds,
} from '../src/features/market-filters';

const offer = {
  name: 'Vay mua Ô tô',
  nameEn: 'New Car Loan',
  institution: 'Ngân hàng A',
  category: 'auto' as const,
  purposes: ['Mua ô tô mới'],
  purposesEn: ['Buy a new car'],
  amountMin: 20_000_000,
  amountMax: null,
  monthsMin: 12,
  monthsMax: 84,
};

describe('published loan discovery', () => {
  it('normalizes Vietnamese and filters the stated loan purpose', () => {
    expect(
      matchesPublishedLoan(offer, {
        category: 'auto',
        query: 'ngan hang mua o to',
        amount: null,
        months: null,
      }),
    ).toBe(true);
    expect(
      matchesPublishedLoan(offer, { category: 'education', query: '', amount: null, months: null }),
    ).toBe(false);
  });

  it('excludes only outside verified bounds and marks relevant missing data', () => {
    expect(
      matchesPublishedLoan(offer, { category: 'all', query: '', amount: 50_000_000, months: 24 }),
    ).toBe(true);
    expect(hasUnknownRelevantBounds(offer, 50_000_000, 24)).toBe(true);
    expect(hasUnknownRelevantBounds(offer, null, 24)).toBe(false);
    expect(
      matchesPublishedLoan(offer, { category: 'all', query: '', amount: 12_000_000, months: 24 }),
    ).toBe(false);
    expect(
      matchesPublishedLoan(offer, { category: 'all', query: '', amount: 50_000_000, months: 96 }),
    ).toBe(false);
  });

  it('includes both endpoints without making an unsupported guarantee', () => {
    expect(withinPublishedBounds(20_000_000, { min: 20_000_000, max: null })).toBe(true);
    expect(withinPublishedBounds(84, { min: 12, max: 84 })).toBe(true);
  });
});
