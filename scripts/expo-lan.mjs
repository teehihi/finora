import { spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isIPv4 } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const localWeb = 'http://localhost:8081';

// A legacy install has the exact private API URL in both default .env files
// and the corresponding Expo origin appended by the former expo:lan script.
function privateHost(address) {
  if (!isIPv4(address)) return false;
  const [first, second] = address.split('.').map(Number);
  return (
    first === 10 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

function generatedValue(contents, key) {
  const lines = [...contents.matchAll(new RegExp(`^${key}=([^\\r\\n]*)\\r?$`, 'gm'))];
  const raw = lines[0]?.[1];
  return lines.length === 1 && parseEnv(contents)[key] === raw ? raw : undefined;
}

function setLine(contents, key, value) {
  return contents.replace(new RegExp(`^${key}=[^\\r\\n]*`, 'm'), () => `${key}=${value}`);
}

export function cleanLegacyLan(appEnv, apiEnv) {
  const old = generatedValue(apiEnv, 'BETTER_AUTH_URL');
  const origins = generatedValue(apiEnv, 'WEB_ORIGINS')?.split(',') ?? [];
  const host = old?.match(/^http:\/\/([\d.]+):3000$/)?.[1];
  if (
    !host ||
    !privateHost(host) ||
    !origins.includes(localWeb) ||
    !origins.includes(`http://${host}:8081`) ||
    parseEnv(apiEnv).PORT !== '3000' ||
    parseEnv(apiEnv).NODE_ENV !== 'development' ||
    ![old, ''].includes(generatedValue(appEnv, 'EXPO_PUBLIC_API_URL'))
  ) {
    return { appEnv, apiEnv };
  }
  return {
    appEnv: setLine(appEnv, 'EXPO_PUBLIC_API_URL', ''),
    apiEnv: setLine(
      setLine(apiEnv, 'BETTER_AUTH_URL', 'http://localhost:3000'),
      'WEB_ORIGINS',
      origins
        .filter((origin) => !privateHost(origin.match(/^http:\/\/([\d.]+):8081$/)?.[1]))
        .join(','),
    ),
  };
}

function writeChanged(path, before, after) {
  if (before === after) return;
  const temporary = join(dirname(path), `.env.finora-${randomUUID()}`);
  try {
    writeFileSync(temporary, after, { flag: 'wx', mode: statSync(path).mode & 0o777 });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function prepareNetwork(workspace, options = process.env) {
  if (options.FINORA_KEEP_LEGACY_LAN === '1') return false;
  const appPath = join(workspace, 'apps/app/.env');
  const apiPath = join(workspace, 'apps/api/.env');
  if (!existsSync(appPath) || !existsSync(apiPath)) return false;
  const appEnv = readFileSync(appPath, 'utf8');
  const apiEnv = readFileSync(apiPath, 'utf8');
  const result = cleanLegacyLan(appEnv, apiEnv);
  // App first so that it never embeds the old address if both dev tasks start together.
  // The empty app URL is also recognized if the second write was interrupted.
  writeChanged(appPath, appEnv, result.appEnv);
  writeChanged(apiPath, apiEnv, result.apiEnv);
  return appEnv !== result.appEnv || apiEnv !== result.apiEnv;
}

function main() {
  const [mode = 'prepare', ...args] = process.argv.slice(2);
  if (!['prepare', 'api-dev', 'api-start'].includes(mode)) {
    throw new Error('Expected prepare, api-dev or api-start.');
  }
  if (prepareNetwork(root))
    console.log(
      'Cleared legacy generated LAN settings. Metro and the browser now supply the host.',
    );
  if (mode === 'prepare') return;
  const api = join(root, 'apps/api');
  const dev = mode === 'api-dev';
  const entry = dev ? createRequire(join(api, 'package.json')).resolve('tsx/cli') : 'dist/main.js';
  const env = { ...process.env, ...(dev ? { FINORA_DEV_LAN: '1' } : {}) };
  const child = spawn(
    process.execPath,
    dev ? [entry, 'watch', 'src/main.ts', ...args] : [entry, ...args],
    {
      cwd: api,
      env,
      stdio: 'inherit',
    },
  );
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
