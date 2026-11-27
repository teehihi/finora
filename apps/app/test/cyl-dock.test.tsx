import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import type { CYLDockProps } from '../src/components/CYLDock';

const originalMode = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
afterEach(() => {
  if (originalMode) Object.defineProperty(globalThis, '__DEV__', originalMode);
  jest.resetModules();
});

function load(installed: null | { isLiquidGlassActive?: boolean }) {
  const native = jest.fn(() => installed);
  const view = jest.fn((_name: string) => 'NativeCYL');
  jest.doMock('expo', () => ({ requireOptionalNativeModule: native, requireNativeView: view }));
  const result = jest.requireActual<typeof import('../src/components/CYLDock.ios')>(
    '../src/components/CYLDock.ios',
  );
  return { ...result, native, view };
}

describe('CYL native selection', () => {
  it('loads CYL by default in release without a developer flag', () => {
    Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
    const dock = load({ isLiquidGlassActive: true });
    expect(dock.cylDockAvailable).toBe(true);
    expect(dock.view).toHaveBeenCalledWith('FinoraCYLDock');
  });

  it.each([null, {}, { isLiquidGlassActive: false }])(
    'keeps fallback when the native capability is absent: %p',
    (module) => {
      const dock = load(module);
      expect(dock.cylDockAvailable).toBe(false);
      expect(dock.view).not.toHaveBeenCalled();
    },
  );

  it('does not link CYL from the Android/web entry point', () => {
    const dock = jest.requireActual<typeof import('../src/components/CYLDock')>(
      '../src/components/CYLDock',
    );
    expect(dock.cylDockAvailable).toBe(false);
  });

  it('wires native selection and safe-area-inclusive height only with an installed pilot', () => {
    const pilot = load({ isLiquidGlassActive: true });
    expect(pilot.view).toHaveBeenCalledWith('FinoraCYLDock');
    const props: CYLDockProps = {
      height: 83,
      routeKey: '/loans',
      scrollTarget: 'finora-cyl-primary-scroll:/loans',
      compact: true,
      dark: false,
      selectedIndex: 3,
      titles: ['Home', 'Explore', 'AI', 'Loans', 'Profile'],
      onHeight: jest.fn(),
      onSelect: jest.fn(),
    };
    const element = pilot.default(props) as ReactElement<{
      selectedIndex: number;
      compact: boolean;
      routeKey: string;
      scrollTarget: string;
      onTabSelect: (event: { nativeEvent: { index: number; identifier: string } }) => void;
      onDockHeight: (event: { nativeEvent: { height: number } }) => void;
    }>;
    expect(element.props.selectedIndex).toBe(3);
    expect(element.props.compact).toBe(true);
    expect(element.props.routeKey).toBe('/loans');
    expect(element.props.scrollTarget).toBe('finora-cyl-primary-scroll:/loans');
    const composer = pilot.default({
      ...props,
      routeKey: '/assistant',
      compact: false,
      scrollTarget: undefined,
    }) as typeof element;
    expect(composer.props.scrollTarget).toBe('');
    expect(composer.props.compact).toBe(false);
    element.props.onTabSelect({ nativeEvent: { index: 2, identifier: 'ai' } });
    expect(props.onSelect).toHaveBeenCalledWith(2, 'ai');
    for (const height of [NaN, 0, -1, 92.5])
      element.props.onDockHeight({ nativeEvent: { height } });
    expect(props.onHeight).toHaveBeenCalledTimes(1);
    expect(props.onHeight).toHaveBeenCalledWith(93);
  });
});
