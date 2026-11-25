import {
  chooseDraftPrompt,
  chooseSimulationId,
  safeSource,
} from '../src/features/intelligence/model';

describe('Intelligence render boundaries', () => {
  it('keeps source links public HTTPS with no credentials or active scheme', () => {
    expect(safeSource('https://www.vpbank.com.vn/ca-nhan')?.hostname).toBe('www.vpbank.com.vn');
    for (const unsafe of [
      'http://bank.vn',
      'javascript:alert(1)',
      'data:text/html,abc',
      'https://localhost',
      'https://127.0.0.1',
      'https://private.local',
      'https://bank.vn:5000',
      'https://bank.vn@other.vn/path',
      'https://bank.vn\\@other.vn',
    ])
      expect(safeSource(unsafe)).toBeNull();
  });

  it('trims prefills as literal text and does not treat them as routes', () => {
    expect(chooseDraftPrompt(' <script>x</script> ')).toBe('<script>x</script>');
    expect(chooseDraftPrompt('abc\u0000def')).toBe('abcdef');
    expect(chooseDraftPrompt('x'.repeat(1400))).toHaveLength(1200);
    expect(chooseDraftPrompt(['bad'])).toBe('');
    expect(chooseSimulationId('javascript:example')).toBeUndefined();
    expect(chooseSimulationId('036cb348-b3a8-4492-a5d5-ba4c3ca1f525')).toBe(
      '036cb348-b3a8-4492-a5d5-ba4c3ca1f525',
    );
  });
});
