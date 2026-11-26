import { isIPv4 } from 'node:net';
import { networkInterfaces } from 'node:os';

const virtualInterface =
  /^(?:awdl|llw|utun|tun|tap|docker|veth|bridge|br-|vmnet|vbox|tailscale|zerotier|wg)/i;

function privateIPv4(address: string) {
  if (!isIPv4(address)) return false;
  const [first, second] = address.split('.').map(Number);
  return (
    first === 10 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

export function currentDevelopmentOrigins(
  enabled: boolean,
  interfaces: ReturnType<typeof networkInterfaces> = enabled ? networkInterfaces() : {},
) {
  if (!enabled) return [];
  const addresses = Object.entries(interfaces).flatMap(([name, entries]) =>
    virtualInterface.test(name)
      ? []
      : (entries ?? [])
          .filter(
            ({ address, family, internal }) =>
              family === 'IPv4' && !internal && privateIPv4(address),
          )
          .map(({ address }) => address),
  );
  return [...new Set(['localhost', '127.0.0.1', '[::1]', '10.0.2.2', ...addresses])].map(
    (host) => 'http://' + host + ':8081',
  );
}

export function createWebOrigins(
  configured: string[],
  enabled: boolean,
  readInterfaces = networkInterfaces,
) {
  return () => [
    ...new Set([
      ...configured,
      ...currentDevelopmentOrigins(enabled, enabled ? readInterfaces() : {}),
    ]),
  ];
}
