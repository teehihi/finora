import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cleanLegacyLan, prepareNetwork } from './expo-lan.mjs';

const app = 'EXPO_PUBLIC_API_URL=http://192.168.8.2:3000\n';
const api = [
  'NODE_ENV=development',
  'PORT=3000',
  'BETTER_AUTH_URL=http://192.168.8.2:3000',
  'WEB_ORIGINS=http://localhost:8081,http://192.168.8.2:8081,http://10.200.0.44:8081,https://preview.example.test',
  'BETTER_AUTH_SECRET=unchanged',
  '',
].join('\n');

test('clears former generated IP and accumulated origins once without touching other settings', () => {
  const result = cleanLegacyLan(app, api);
  assert.equal(result.appEnv, 'EXPO_PUBLIC_API_URL=\n');
  assert.match(result.apiEnv, /^BETTER_AUTH_URL=http:\/\/localhost:3000$/m);
  assert.match(
    result.apiEnv,
    /^WEB_ORIGINS=http:\/\/localhost:8081,https:\/\/preview.example.test$/m,
  );
  assert.match(result.apiEnv, /^BETTER_AUTH_SECRET=unchanged$/m);
  assert.deepEqual(cleanLegacyLan(result.appEnv, result.apiEnv), result);
});

test('cleaned app with interrupted API cleanup is recoverable', () => {
  assert.equal(
    cleanLegacyLan('EXPO_PUBLIC_API_URL=\n', api).apiEnv,
    cleanLegacyLan(app, api).apiEnv,
  );
});

test('intentional remote endpoints and nondefault configurations are not overwritten', () => {
  const explicit = 'EXPO_PUBLIC_API_URL=https://api.example.test\n';
  const manualApi = api.replace('PORT=3000', 'PORT=3300');
  assert.deepEqual(cleanLegacyLan(explicit, api), { appEnv: explicit, apiEnv: api });
  assert.deepEqual(cleanLegacyLan(app, manualApi), { appEnv: app, apiEnv: manualApi });
  const testEnv = api.replace('NODE_ENV=development', 'NODE_ENV=test');
  assert.deepEqual(cleanLegacyLan(app, testEnv), { appEnv: app, apiEnv: testEnv });
});

test('a fresh build needs no env files; an explicit opt-out and local overrides survive', () => {
  const root = mkdtempSync(join(tmpdir(), 'finora-lan-'));
  try {
    assert.equal(prepareNetwork(root, {}), false);
    mkdirSync(join(root, 'apps/app'), { recursive: true });
    mkdirSync(join(root, 'apps/api'), { recursive: true });
    const appPath = join(root, 'apps/app/.env');
    const apiPath = join(root, 'apps/api/.env');
    const overridePath = join(root, 'apps/app/.env.local');
    const override = 'EXPO_PUBLIC_API_URL=https://api.example.test\n';
    writeFileSync(appPath, app, { mode: 0o600 });
    writeFileSync(apiPath, api, { mode: 0o600 });
    writeFileSync(overridePath, override, { mode: 0o600 });
    assert.equal(prepareNetwork(root, { FINORA_KEEP_LEGACY_LAN: '1' }), false);
    assert.equal(readFileSync(appPath, 'utf8'), app);
    assert.equal(prepareNetwork(root, {}), true);
    assert.equal(statSync(apiPath).mode & 0o777, 0o600);
    assert.equal(readFileSync(overridePath, 'utf8'), override);
    assert.equal(prepareNetwork(root, {}), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
