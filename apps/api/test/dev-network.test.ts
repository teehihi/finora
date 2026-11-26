import type { NetworkInterfaceInfo } from 'node:os';
import { createWebOrigins, currentDevelopmentOrigins } from '../src/config/dev-network';

const address = (value: string): NetworkInterfaceInfo => ({
  address: value,
  netmask: '255.255.255.0',
  family: 'IPv4',
  mac: '00:00:00:00:00:00',
  internal: false,
  cidr: value + '/24',
});

test('the same running API swaps old and new local Wi-Fi origins without accumulating them', () => {
  let current = { en0: [address('192.168.4.21')] };
  const configured = ['https://preview.example.test'];
  const origins = createWebOrigins(configured, true, () => current);
  expect(origins()).toContain('http://192.168.4.21:8081');
  current = { en0: [address('10.10.44.58')] };
  expect(origins()).toContain('http://10.10.44.58:8081');
  expect(origins()).not.toContain('http://192.168.4.21:8081');
  expect(origins()).not.toContain('http://10.10.44.58:3000');
  expect(origins()).not.toContain('http://10.10.44.59:8081');
  expect(origins()).toContain(configured[0]);
});

test('virtual, link-local and public interfaces do not become automatic trusted origins', () => {
  expect(
    currentDevelopmentOrigins(true, {
      en0: [address('169.254.4.21'), address('198.51.100.10')],
      utun1: [address('10.0.5.13')],
      docker0: [address('172.17.0.1')],
    }),
  ).toEqual([
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://[::1]:8081',
    'http://10.0.2.2:8081',
  ]);
});

test('non-development startup does not read network interfaces or add browser origins', () => {
  const configured = ['http://localhost:8081'];
  const origins = createWebOrigins(configured, false, () => {
    throw new Error('should not enumerate');
  });
  expect(origins()).toEqual(configured);
});
