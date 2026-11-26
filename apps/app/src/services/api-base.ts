const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

function metroHost(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value.includes('://') ? value : 'http://' + value);
    if (!['http:', 'https:', 'exp:', 'exps:'].includes(url.protocol) || !url.hostname)
      return undefined;
    return url.hostname;
  } catch {
    return undefined;
  }
}

export function resolveApiBase({
  configured,
  platform,
  development,
  webLocation,
  bundleUrl,
  hostUri,
}: {
  configured?: string;
  platform: string;
  development: boolean;
  webLocation?: Pick<Location, 'protocol' | 'hostname'>;
  bundleUrl?: string;
  hostUri?: string;
}) {
  if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
  if (platform === 'web' && webLocation?.hostname) {
    return webLocation.protocol + '//' + webLocation.hostname + ':3000';
  }
  if (development && platform !== 'web') {
    // The script URL follows the Metro server that actually loaded this session.
    // A manifest provides a fallback when the native module is unavailable.
    const host = metroHost(bundleUrl) ?? metroHost(hostUri);
    if (host && !LOOPBACK.has(host)) return 'http://' + host + ':3000';
  }
  return platform === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}
