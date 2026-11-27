import { render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import { LaunchScene } from '../src/components/LaunchScene';
import Index from '../app/index';
import { auth } from '../src/services/client';

jest.mock('../src/services/client', () => ({ auth: { useSession: jest.fn() } }));
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{href}</Text>;
  },
}));
afterEach(() => jest.restoreAllMocks());

it('shows one busy state without animation when Reduce Motion is enabled', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const loop = jest.spyOn(Animated, 'loop');
  const screen = await render(<LaunchScene />);
  expect(screen.getByRole('progressbar', { name: 'Đang mở Finora', busy: true })).toBeTruthy();
  expect(loop).not.toHaveBeenCalled();
});

it.each([
  [true, '/home'],
  [false, '/auth'],
] as const)(
  'releases immediately on a resolved session (signed in: %s)',
  async (signedIn, path) => {
    const useSession = auth.useSession as jest.Mock;
    useSession.mockReturnValue({ isPending: true, data: null });
    const screen = await render(<Index />);
    expect(screen.getByTestId('finora-launch')).toBeTruthy();
    useSession.mockReturnValue({ isPending: false, data: signedIn ? { user: {} } : null });
    await screen.rerender(<Index />);
    expect(screen.queryByTestId('finora-launch')).toBeNull();
    expect(screen.getByText(path)).toBeTruthy();
  },
);
