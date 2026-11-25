import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
const env = parse(readFileSync('apps/api/.env'));
const target = new URL(process.env.DATABASE_URL ?? env.DATABASE_URL);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  env.NODE_ENV !== 'development' ||
  !process.stdin.isTTY
)
  throw Error('Interactive local development reset only.');
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  'Erase all records in ' + target.hostname + target.pathname + '? Type RESET FINORA: ',
);
rl.close();
if (answer === 'RESET FINORA') {
  const r = spawnSync(
    'pnpm',
    [
      '--filter',
      '@finora/database',
      'exec',
      'prisma',
      'migrate',
      'reset',
      '--force',
      '--skip-seed',
    ],
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL: target.toString() } },
  );
  if (r.status !== 0) process.exit(1);
  process.exit(spawnSync('pnpm', ['db:seed'], { stdio: 'inherit' }).status ?? 1);
}
