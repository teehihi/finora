import { safeNarrative } from '../src/modules/intelligence-narrative.js';

describe('live assistant narrative boundary', () => {
  it('accepts a short general explanation in the requested language', () => {
    expect(safeNarrative('I can help compare repayment terms.', 'en-US')).toBe(
      'I can help compare repayment terms.',
    );
    expect(safeNarrative('Mình có thể giúp bạn so sánh kỳ hạn trả nợ.', 'vi-VN')).toBe(
      'Mình có thể giúp bạn so sánh kỳ hạn trả nợ.',
    );
  });

  it.each([
    'The rate is 12%.',
    'You qualify for this loan.',
    'Bạn chắc chắn được duyệt vay.',
    'Visit https://example.test to apply.',
    'Your monthly payment is ₫500000.',
    'There are no fees for this loan.',
    'Khoản vay này miễn phí.',
    'You can afford this loan.',
  ])('rejects unsupported numerical or eligibility claims: %s', (value) => {
    expect(safeNarrative(value, 'en-US')).toBeNull();
  });
});
