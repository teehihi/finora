import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDescription, renderDescription, syncDescription } from './pr-description.mjs';

const prUrl = 'https://github.com/teehihi/finora/pull/9';
const pr = {
  state: 'open',
  head: { sha: 'current-head' },
  base: { ref: 'main', sha: 'base' },
  body: 'Notes from maintainers.',
  changed_files: 4,
  additions: 62,
  deletions: 7,
  commits: 1,
};
const files = [
  { filename: 'apps/app/src/features/auth/AuthArtwork.tsx' },
  { filename: 'tests/e2e/auth.spec.ts' },
  { filename: 'packages/database/prisma/migrations/sample/migration.sql' },
  { filename: '.github/workflows/ci.yml' },
];
const commit = (message) => ({ commit: { message } });
const event = { number: 9, pull_request: { head: { sha: 'current-head' } } };
const env = { GITHUB_REPOSITORY: 'teehihi/finora', GITHUB_TOKEN: 'fixture' };

test('builds English sections from real file metadata without inventing evidence', () => {
  const result = renderDescription({
    pr,
    files,
    commits: [commit('fix(app): guard missing auth locale export')],
    prUrl,
  });
  assert.match(result, /4 changed files · \+62 \/ −7 lines/);
  assert.match(result, /App UI and navigation/);
  assert.match(result, /fix\(app\): guard missing auth locale export/);
  assert.match(result, /Database migrations changed/);
  assert.match(result, /Workflow definitions changed/);
  assert.match(result, /1 test file changed/);
  assert.match(result, /## UI evidence/);
  assert.ok(result.includes(prUrl + '/checks'));
  assert.doesNotMatch(result, /all tests passed|closes #\d+/i);
});

test('keeps metadata in text and strips comment delimiters and commit bodies', () => {
  const result = renderDescription({
    pr,
    files,
    commits: [commit('closes #123 <script> ` @user\nSECRET UNDER THE SUBJECT')],
    prUrl,
  });
  assert.match(result, /- `closes ＃123\s+script\s+＠user`/);
  assert.doesNotMatch(result, /<script>|SECRET/);
});

test('labels partial metadata and omits UI evidence for docs-only changes', () => {
  const result = renderDescription({ pr, files: [{ filename: 'README.md' }], commits: [], prUrl });
  assert.match(result, /first 1 of 4/);
  assert.doesNotMatch(result, /## UI evidence/);
});

test('preserves everything outside one well-formed block', () => {
  const old =
    'Personal opening.\n\n<!-- finora:auto:start -->\nstale\n<!-- finora:auto:end -->\n\nCloses #1\n![web](https://example.test/s.png)';
  const block = '<!-- finora:auto:start -->\nnew\n<!-- finora:auto:end -->';
  const changed = mergeDescription(old, block);
  assert.equal(changed, old.replace('stale', 'new'));
  assert.equal(mergeDescription(changed, block), changed);
  assert.equal(mergeDescription(pr.body, block), block + '\n\n' + pr.body);
  assert.equal(
    mergeDescription(old + '<!-- finora:auto:end -->', block),
    old + '<!-- finora:auto:end -->',
  );
});

function mock({ stale, body, snapshot = pr, listedFiles = files } = {}) {
  let reads = 0;
  const requests = [];
  const fetchImpl = async (url, options) => {
    const path = url.pathname.split('/').at(-1);
    assert.equal(url.host, 'api.github.com');
    assert.equal(options.redirect, 'error');
    requests.push({ method: options.method, url: url.href, body: options.body });
    let data;
    if (options.method === 'PATCH') data = {};
    else if (path === 'files') {
      const offset = (Number(url.searchParams.get('page')) - 1) * 100;
      data = listedFiles.slice(offset, offset + 100);
    } else if (path === 'commits') data = [commit('fix(auth): guard locale')];
    else if (reads++ === 0) data = snapshot;
    else
      data = {
        ...snapshot,
        body: body ?? snapshot.body,
        ...(stale ? { head: { sha: 'new-head' } } : {}),
      };
    return { ok: true, json: async () => data };
  };
  return { fetchImpl, requests };
}

test('patches only the description and uses latest human notes', async () => {
  const { fetchImpl, requests } = mock({ body: 'Human edit added while reading changes.' });
  assert.equal(await syncDescription({ event, env, fetchImpl }), 'updated');
  const patches = requests.filter((r) => r.method === 'PATCH');
  assert.equal(patches.length, 1);
  const update = JSON.parse(patches[0].body);
  assert.deepEqual(Object.keys(update), ['body']);
  assert.match(update.body, /Human edit added while reading changes\.$/);
});

test('fetches later pages of changed files', async () => {
  const many = Array.from({ length: 101 }, (_, i) => ({
    filename: i < 100 ? `docs/${i}.md` : 'tests/e2e/final.spec.ts',
  }));
  const { fetchImpl, requests } = mock({
    snapshot: { ...pr, changed_files: 101 },
    listedFiles: many,
  });
  assert.equal(await syncDescription({ event, env, fetchImpl }), 'updated');
  assert.equal(requests.filter((r) => r.url.includes('/files?')).length, 2);
  assert.match(JSON.parse(requests.at(-1).body).body, /1 test file changed/);
});

test('does not overwrite a different head, malformed block, or oversized description', async () => {
  for (const fixture of [
    { stale: true, outcome: 'stale' },
    { body: '<!-- finora:auto:start -->\nHand-written text', outcome: 'unchanged' },
    { body: 'x'.repeat(65_300), outcome: 'description too long' },
  ]) {
    const { fetchImpl, requests } = mock(fixture);
    assert.equal(await syncDescription({ event, env, fetchImpl }), fixture.outcome);
    assert.equal(
      requests.some((r) => r.method === 'PATCH'),
      false,
    );
  }
});
