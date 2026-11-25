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

const ip = candidates.find(({ address }) =>
  /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(address),
)?.address;

if (!ip) {
  console.error('Không tìm thấy IPv4 LAN. Kết nối máy tính và điện thoại cùng Wi-Fi rồi chạy lại.');
  process.exit(1);
}

function setEnvValue(path, key, value) {
  const contents = readFileSync(path, 'utf8');
  const line = new RegExp(`^${key}=.*$`, 'm');
  if (!line.test(contents)) throw new Error(`Không tìm thấy ${key} trong ${path}`);
  writeFileSync(path, contents.replace(line, `${key}=${value}`));
}

const apiUrl = `http://${ip}:3000`;
const webOrigin = `http://${ip}:8081`;
setEnvValue('apps/app/.env', 'EXPO_PUBLIC_API_URL', apiUrl);
setEnvValue('apps/api/.env', 'BETTER_AUTH_URL', apiUrl);

const apiEnv = readFileSync('apps/api/.env', 'utf8');
const originsMatch = apiEnv.match(/^WEB_ORIGINS=(.*)$/m);
if (!originsMatch) throw new Error('Không tìm thấy WEB_ORIGINS trong apps/api/.env');
const origins = originsMatch[1]
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (!origins.includes(webOrigin)) origins.push(webOrigin);
setEnvValue('apps/api/.env', 'WEB_ORIGINS', origins.join(','));

console.log(`Đã cấu hình API Expo: ${apiUrl}`);
console.log(`Đã cho phép Expo origin: ${webOrigin}`);
console.log('Chạy lại pnpm dev để khởi động API và Metro với cấu hình mới.');
console.log('Build native mới để nhúng EXPO_PUBLIC_API_URL vào app.');
