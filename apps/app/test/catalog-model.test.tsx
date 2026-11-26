import { describe, expect, it } from '@jest/globals';
import { filterProducts } from '../src/features/catalog-model';
import type { Product } from '@finora/contracts';

const education: Product = {
  id: 'learning',
  name: 'Đồng hành học tập',
  nameEn: 'Education plan',
  institution: 'Finora Sandbox',
  category: 'education',
  amountMin: 10_000_000,
  amountMax: 40_000_000,
  monthsMin: 6,
  monthsMax: 24,
  rateMin: 8,
  rateMax: 12,
  fee: null,
  method: 'annuity',
  source: 'Sample catalog',
};
const personal: Product = {
  ...education,
  id: 'personal',
  name: 'Chi tiêu linh hoạt',
  nameEn: 'Flexible personal loan',
  category: 'personal',
  rateMin: 6,
  rateMax: 15,
};

describe('catalog filters', () => {
  it('matches Vietnamese names regardless of accents or letter case, including đ', () => {
    expect(filterProducts([education, personal], '  DONG HANH HOC TAP ', 'all', 'all')).toEqual([
      education,
    ]);
    expect(filterProducts([education, personal], 'chi tiêu', 'all', 'all')).toEqual([personal]);
    expect(filterProducts([education, personal], 'sandbox   hoc tap', 'all', 'all')).toEqual([
      education,
    ]);
  });
  it('combines category and the maximum annual rate rather than the advertised minimum', () => {
    expect(filterProducts([personal, education], '', 'all', '12')).toEqual([education]);
    expect(filterProducts([personal, education], '', 'personal', '12')).toEqual([]);
    expect(filterProducts([personal, education], 'Flexible', 'personal', '15')).toEqual([personal]);
  });
});
