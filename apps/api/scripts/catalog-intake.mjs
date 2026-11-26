import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { reviewedLoanDatasetSchema } from '@finora/contracts';

const [candidate, mode, ...extra] = process.argv.slice(2);
if (!candidate || extra.length || (mode !== undefined && mode !== '--publish-local')) {
  console.error(
    'Usage: node apps/api/scripts/catalog-intake.mjs <candidate.json> [--publish-local]',
  );
  process.exit(2);
}
const parsed = reviewedLoanDatasetSchema.safeParse(JSON.parse(await readFile(candidate, 'utf8')));
if (!parsed.success) {
  for (const issue of parsed.error.issues)
    console.error(issue.path.join('.') + ': ' + issue.message);
  process.exit(1);
}
console.log('Validated ' + parsed.data.length + ' reviewed public loan records.');
if (mode === '--publish-local') {
  const output = new URL('../src/catalog/loans.vn.json', import.meta.url);
  const temp = new URL('../src/catalog/.import-' + randomUUID() + '.json', import.meta.url);
  try {
    await writeFile(temp, JSON.stringify(parsed.data, null, 2) + '\n', { flag: 'wx' });
    await rename(temp, output);
  } finally {
    await unlink(temp).catch(() => undefined);
  }
  console.log(
    'Updated local dataset. Review the git diff before committing; nothing was deployed.',
  );
}
