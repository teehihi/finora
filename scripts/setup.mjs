import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';
function run(program, args) {
  const r = spawnSync(program, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const [major, minor] = process.versions.node.split('.').map(Number);
if (major !== 22 || minor < 20)
  throw Error('Finora requires Node 22.20 or later in the 22.x series');
function prepare(path, transform = (s) => s) {
  if (!existsSync(path))
    writeFileSync(path, transform(readFileSync(path + '.example', 'utf8')), {
      flag: 'wx',
      mode: 0o600,
    });
}
prepare('.env');
const root = parse(readFileSync('.env'));
prepare('apps/api/.env', (s) =>
  s
    .replace('BETTER_AUTH_SECRET=', 'BETTER_AUTH_SECRET=' + randomBytes(48).toString('base64url'))
    .replace(
      /DATABASE_URL=.+/,
      'DATABASE_URL=postgresql://' +
        encodeURIComponent(root.POSTGRES_USER) +
        ':' +
        encodeURIComponent(root.POSTGRES_PASSWORD) +
        '@localhost:' +
        root.POSTGRES_PORT +
        '/' +
        encodeURIComponent(root.POSTGRES_DB) +
        '?schema=public',
    ),
);
prepare('apps/app/.env');
if (!process.argv.includes('--env-only')) {
  run('docker', ['compose', 'version']);
  for (const command of ['infra:up', 'db:generate', 'db:migrate', 'db:seed'])
    run('pnpm', [command]);
}
