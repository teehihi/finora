import { homeStressPreview } from '../src/features/home-model';

describe('illustrative cash flow stress', () => {
  const profile = { income: 15000000, expenses: 8000000, debt: 1000000 };
  it('shows each stress independently and combines them without mutating the profile', () => {
    expect(homeStressPreview(profile, 'income')).toEqual({ baseline: 6000000, stressed: 3000000 });
    expect(homeStressPreview(profile, 'expenses').stressed).toBe(4400000);
    expect(homeStressPreview(profile, 'both').stressed).toBe(1400000);
    expect(profile).toEqual({ income: 15000000, expenses: 8000000, debt: 1000000 });
  });

  it('keeps a shortfall negative and rounds the illustrative shocks to whole VND consistently with Finora AI', () => {
    expect(homeStressPreview({ income: 11, expenses: 6, debt: 4 }, 'both')).toEqual({
      baseline: 1,
      stressed: -2,
    });
  });
});
