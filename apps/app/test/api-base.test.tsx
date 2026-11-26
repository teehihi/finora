import { resolveApiBase } from '../src/services/api-base';

test('a web browser follows the hostname of the current page, not the previous Wi-Fi', () => {
  expect(
    resolveApiBase({
      platform: 'web',
      development: true,
      webLocation: { protocol: 'http:', hostname: '192.168.1.5' },
      hostUri: '10.0.0.42:8081',
    }),
  ).toBe('http://192.168.1.5:3000');
});

test('the current native Metro bundle wins over a stale Expo manifest host', () => {
  expect(
    resolveApiBase({
      platform: 'ios',
      development: true,
      bundleUrl: 'http://192.168.1.5:8081/index.bundle',
      hostUri: '10.0.0.42:8081',
    }),
  ).toBe('http://192.168.1.5:3000');
});

test('native URL fallback covers iOS and Android simulators and no baked Metro host in release', () => {
  expect(
    resolveApiBase({
      platform: 'ios',
      development: true,
      bundleUrl: 'file:///local/main.jsbundle',
      hostUri: '192.168.1.5:8081',
    }),
  ).toBe('http://192.168.1.5:3000');
  expect(
    resolveApiBase({ platform: 'android', development: true, hostUri: '127.0.0.1:8081' }),
  ).toBe('http://10.0.2.2:3000');
  expect(resolveApiBase({ platform: 'ios', development: false, hostUri: '192.168.1.5:8081' })).toBe(
    'http://localhost:3000',
  );
});

test('an explicitly configured deployment API takes precedence on both web and native', () => {
  for (const platform of ['web', 'android', 'ios']) {
    expect(
      resolveApiBase({
        configured: 'https://api.example.test/',
        platform,
        development: true,
        hostUri: '192.168.1.5:8081',
        webLocation: { protocol: 'http:', hostname: '192.168.1.5' },
      }),
    ).toBe('https://api.example.test');
  }
});
