import { allowedAuthReturn, workspaceAuthReturn } from '../src/features/auth/return-path';

describe('authentication return paths', () => {
  it('retains safe route-specific view choices', () => {
    const cases = [
      ['/explore', { mode: 'sample', intent: 'compare' }, '/explore?mode=sample&intent=compare'],
      ['/explore', { mode: 'sample' }, '/explore?mode=sample'],
      ['/explore', { mode: 'public', intent: 'compare' }, '/explore?mode=public'],
      ['/loans', { pane: 'simulations' }, '/loans?pane=simulations'],
      ['/loans', { pane: 'schedule' }, '/loans?pane=schedule'],
      ['/saved/owned-example', {}, '/saved/owned-example'],
      ['/profile/personal', { oauth: 'link-error' }, '/profile/personal'],
      ['/profile/finance', {}, '/profile/finance'],
      ['/search', { term: 'private' }, '/search'],
    ] as const;

    for (const [path, params, expected] of cases) {
      const target = workspaceAuthReturn(path, params);
      expect(target).toBe(expected);
      expect(allowedAuthReturn(target)).toBe(expected);
    }
  });

  it('does not copy drafts, financial inputs, or ambiguous selectors into auth URLs', () => {
    expect(
      workspaceAuthReturn('/simulate/custom', { handoff: 'example', amount: '80000000' }),
    ).toBe('/simulate/custom');
    expect(
      workspaceAuthReturn('/assistant', { draftPrompt: 'example', simulationId: 'demo' }),
    ).toBe('/assistant');
    expect(workspaceAuthReturn('/explore', { mode: ['sample', 'public'], intent: 'compare' })).toBe(
      '/explore',
    );
    expect(workspaceAuthReturn('/loans', { pane: ['simulations'] })).toBe('/loans');
    expect(workspaceAuthReturn('/loans', { pane: 'simulations', mode: 'sample' })).toBe(
      '/loans?pane=simulations',
    );
  });

  it.each(
    [
      undefined,
      ['/profile', '/explore'],
      'https://example.test/explore',
      '//example.test/loans',
      '/explore?mode=sample&mode=public',
      '/explore?mode=sample&next=https://example.test',
      '/explore?mode=sample#profile',
      '/loans?pane=simulations&',
      '/assistant?draftPrompt=example',
      '/simulate/custom?handoff=example',
      '/saved/../profile',
      '/saved/%2e%2e',
      '/profile\n',
      '/profile/invalid',
      '/profile/personal?email=someone@example.test',
    ].map((target) => ({ target })),
  )('rejects invalid auth input $target', ({ target }) => {
    expect(allowedAuthReturn(target)).toBe('/home');
  });
});
