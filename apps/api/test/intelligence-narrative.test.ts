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

  it('permits grounded wording and neutral discussion of rates without permitting unrelated claims', () => {
    expect(safeNarrative('Mình có thể giải thích cách tính lãi.', 'vi-VN')).toBeTruthy();
    const fact = 'Bạn muốn vay 20.000.000 ₫ để sửa xe.';
    const evidence = [{ provenance: 'USER_PROVIDED' as const, text: fact }];
    expect(safeNarrative(fact, 'vi-VN', evidence)).toBe(fact);
    expect(safeNarrative(fact.replace('20.', '21.'), 'vi-VN', evidence)).toBeNull();
  });

  it('requires the full verified claim and labels a hypothetical payment as assumed', () => {
    const tool = 'Cash flow before the new loan is 4,500,000 VND per month.';
    const estimated = 'The assumed first payment is 2,000,000 VND.';
    const hiddenAssumption = 'The first payment is 2,000,000 VND.';
    expect(safeNarrative(tool, 'en-US', [{ text: tool, provenance: 'VERIFIED_TOOL_RESULT' }])).toBe(
      tool,
    );
    expect(
      safeNarrative(estimated, 'en-US', [{ text: estimated, provenance: 'EXPLICIT_SIMULATION' }]),
    ).toBe(estimated);
    expect(
      safeNarrative(hiddenAssumption, 'en-US', [
        { text: hiddenAssumption, provenance: 'EXPLICIT_SIMULATION' },
      ]),
    ).toBeNull();
    const unsupported = 'The lender charges 4,500,000 VND in fees.';
    expect(
      safeNarrative(unsupported, 'en-US', [{ text: tool, provenance: 'VERIFIED_TOOL_RESULT' }]),
    ).toBeNull();
    expect(
      safeNarrative(unsupported, 'en-US', [{ text: unsupported, provenance: 'UNKNOWN' }]),
    ).toBeNull();
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
