import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import type { CYLDockProps } from '../src/components/CYLDockPilot';

const original = process.env.EXPO_PUBLIC_FINORA_DOCK;
afterEach(() => {
  if (original !== undefined) process.env.EXPO_PUBLIC_FINORA_DOCK = original;
  else delete process.env.EXPO_PUBLIC_FINORA_DOCK;
  jest.resetModules();
});

function load(mode: string, installed: boolean) {
  process.env.EXPO_PUBLIC_FINORA_DOCK = mode;
  const native = jest.fn(() => (installed ? {} : null));
  const view = jest.fn((_name: string) => 'NativeCYL');
  jest.doMock('expo', () => ({ requireOptionalNativeModule: native, requireNativeView: view }));
  const result = jest.requireActual<typeof import('../src/components/CYLDockPilot.ios')>(
    '../src/components/CYLDockPilot.ios',
  );
  return { ...result, native, view };
}
describe('CYL pilot selection', () => {
  it('keeps the baseline without even loading the view by default', () => {
    const pilot = load('callstack', true);
    expect(pilot.pilotDockAvailable).toBe(false);
    expect(pilot.native).not.toHaveBeenCalled();
    expect(pilot.view).not.toHaveBeenCalled();
  });
  it('falls back if Metro opts in but the binary lacks the pilot', () => {
    const pilot = load('cyl', false);
    expect(pilot.pilotDockAvailable).toBe(false);
    expect(pilot.view).not.toHaveBeenCalled();
  });
  it('wires native selection and safe-area-inclusive height only with an installed pilot', () => {
    const pilot = load('cyl', true);
    expect(pilot.view).toHaveBeenCalledWith('FinoraCYLDock');
    const props: CYLDockProps = {
      height: 83,
      dark: false,
      selectedIndex: 3,
      titles: ['Home', 'Explore', 'AI', 'Loans', 'Profile'],
      onHeight: jest.fn(),
      onSelect: jest.fn(),
    };
    const element = pilot.default(props) as ReactElement<{
      selectedIndex: number;
      onTabSelect: (event: { nativeEvent: { index: number; identifier: string } }) => void;
      onDockHeight: (event: { nativeEvent: { height: number } }) => void;
    }>;
    expect(element.props.selectedIndex).toBe(3);
    element.props.onTabSelect({ nativeEvent: { index: 2, identifier: 'ai' } });
    expect(props.onSelect).toHaveBeenCalledWith(2, 'ai');
    for (const height of [NaN, 0, -1, 92.5])
      element.props.onDockHeight({ nativeEvent: { height } });
    expect(props.onHeight).toHaveBeenCalledTimes(1);
    expect(props.onHeight).toHaveBeenCalledWith(93);
  });
});
