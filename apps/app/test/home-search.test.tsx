import { searchHomeServices } from '../src/features/home-search-model';

describe('Home service finder', () => {
  it('ignores case, diacritics, word order and Vietnamese crossed d', () => {
    expect(searchHomeServices('DONG  hop', 'vi-VN')).toEqual([
      { label: 'Đọc hợp đồng', href: '/documents' },
    ]);
    expect(searchHomeServices('Thanh toán', 'vi-VN')[0]?.href).toBe('/repayments');
  });

  it('keeps suggestions useful offline and routes saved items to the real loan pane', () => {
    expect(searchHomeServices('', 'en-US')).toHaveLength(8);
    expect(searchHomeServices('saved', 'en-US')[0]?.href).toBe('/loans?pane=simulations');
    expect(searchHomeServices('unknown term', 'vi-VN')).toEqual([]);
  });
});
