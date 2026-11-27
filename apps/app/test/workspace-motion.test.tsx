import { workspaceMotion } from '../src/features/navigation/workspace-motion';
import { overlayMotion } from '@finora/ui';

describe.each(['ios', 'android'])('%s navigation', (platform) => {
  it.each(['home', 'explore', 'assistant', 'loans', 'profile'])('crossfades peer %s', (name) => {
    expect(workspaceMotion(name, false, platform).animation).toBe('fade');
  });
  it.each(['saved/[id]', 'simulate/[id]', 'documents/[id]', 'cashflow', 'repayments'])(
    'uses native push and interactive pop for %s',
    (name) => expect(workspaceMotion(name, false, platform)).toEqual({ animation: 'default' }),
  );
  it('distinguishes a sheet from a centered dialog', () => {
    expect(overlayMotion(true, false, platform)).toBe('slide');
    expect(overlayMotion(false, false, platform)).toBe('fade');
  });
});
it.each([
  [true, 'ios'],
  [true, 'android'],
  [false, 'web'],
] as const)('avoids motion for reduced=%s / %s', (reduced, platform) => {
  for (const name of ['home', 'saved/[id]']) {
    expect(workspaceMotion(name, reduced, platform).animation).toBe('none');
  }
  expect(overlayMotion(true, reduced, platform)).toBe('none');
  expect(overlayMotion(false, reduced, platform)).toBe('none');
});

it('uses a native horizontal pop only on the Fin edge return', () => {
  expect(workspaceMotion('home', false, 'ios', true)).toEqual({
    animation: 'default',
    animationTypeForReplace: 'pop',
  });
  expect(workspaceMotion('home', false, 'ios').animation).toBe('fade');
  expect(workspaceMotion('home', true, 'ios', true).animation).toBe('none');
});
