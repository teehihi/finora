import { readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const candidates = Object.entries(networkInterfaces()).flatMap(([name, entries]) =>
  (entries ?? [])
    .filter(({ family, internal, address }) => {
      const ipv4 = family === 'IPv4' || family === 4;
      return ipv4 && !internal && !address.startsWith('169.254.');
    })
    .map(({ address }) => ({ name, address })),
);

const ip = candidates
  .filter(({ address }) => /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(address))
  .sort((a, b) => {
    const score = ({ name, address }) => {
      if (/^(en\d+|wlan\d*|wlp\w*|wi-?fi)$/i.test(name)) return 0;
      if (/^(eth\d+|enp\w+)$/i.test(name)) return 1;
      if (/^(utun|bridge|docker|veth|vmnet)/i.test(name)) return 3;
      if (address.startsWith('192.168.')) return 1;
      return 2;
    };
    return score(a) - score(b);
  })[0]?.address;

function setEnvValue(path, key, value) {
  const contents = readFileSync(path, 'utf8');
  const line = new RegExp(`^${key}=.*$`, 'm');
  if (!line.test(contents)) throw new Error(`Không tìm thấy ${key} trong ${path}`);
  const updated = contents.replace(line, `${key}=${value}`);
  if (updated !== contents) writeFileSync(path, updated);
}

const apiUrl = ip ? `http://${ip}:3000` : 'http://localhost:3000';
const webOrigin = ip ? `http://${ip}:8081` : undefined;
// Let Expo provide its current hostUri when no private LAN address is available.
setEnvValue('apps/app/.env', 'EXPO_PUBLIC_API_URL', ip ? apiUrl : '');
setEnvValue('apps/api/.env', 'BETTER_AUTH_URL', apiUrl);

const apiEnv = readFileSync('apps/api/.env', 'utf8');
const originsMatch = apiEnv.match(/^WEB_ORIGINS=(.*)$/m);
if (!originsMatch) throw new Error('Không tìm thấy WEB_ORIGINS trong apps/api/.env');
const origins = originsMatch[1]
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (webOrigin && !origins.includes(webOrigin)) origins.push(webOrigin);
setEnvValue('apps/api/.env', 'WEB_ORIGINS', origins.join(','));

if (ip) {
  console.log(`Đã cấu hình API Expo: ${apiUrl}`);
  console.log(`Đã cho phép Expo origin: ${webOrigin}`);
} else {
  console.warn('Không thấy IPv4 LAN riêng; app sẽ lấy host từ Expo, API dùng localhost.');
  console.log(`Đã cấu hình API: ${apiUrl}`);
}
console.log('Các lệnh dev sẽ nạp cấu hình này khi khởi động API và Metro.');
console.log('Build native mới sau khi đổi mạng để cập nhật URL nhúng trong app.');
