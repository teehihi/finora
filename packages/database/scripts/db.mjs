import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
config({ path: '../../apps/api/.env', quiet: true });
const args = process.argv.slice(2);
const child =
  args[0] === 'seed'
    ? spawnSync(process.execPath, ['scripts/seed.mjs'], { stdio: 'inherit' })
    : spawnSync('pnpm', ['exec', 'prisma', ...args], { stdio: 'inherit' });
process.exit(child.status ?? 1);
