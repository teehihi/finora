import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const start = '<!-- finora:auto:start -->';
const end = '<!-- finora:auto:end -->';
const maxFiles = 3_000; // GitHub caps the pull request files endpoint.
const shownCommits = 6;
const tests = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|[.](?:test|spec)[.]/;
const matches = [
  ['App UI and navigation', /^apps\/app\/(?:app|src|assets)\/|^packages\/ui\//],
  ['API and server', /^apps\/api\//],
  ['Financial calculations', /^packages\/financial-engine\//],
  ['Database and migrations', /^packages\/database\//],
  ['API contracts and client', /^packages\/(?:contracts|api-client)\//],
  ['Design tokens and translations', /^packages\/(?:design-tokens|i18n)\//],
  ['CI and repository automation', /^\.github\/|^scripts\//],
  [
    'Dependency and build configuration',
    /(?:^|\/)(?:package\.json|pnpm-lock\.yaml|app\.config\.[^/]+|eas\.json|turbo\.json)$/,
  ],
  ['Documentation', /^(?:docs\/|[^/]+\.md$)/i],
];
const rolloutSignals = [
  [
    'Database migrations changed; review rollout and rollback before merging.',
    /(?:^|\/)migrations\/|schema\.prisma$/,
  ],
  [
    'Runtime or deployment configuration changed; confirm the required environment values.',
    /(?:^|\/)(?:\.env(?:[./]|$)|app\.config\.|eas\.json|vercel\.json|compose\.ya?ml|Dockerfile)/,
  ],
  [
    'Authentication, financial documents, or AI handling changed; review data boundaries and consent.',
    /(?:^|\/)(?:auth|intelligence|documents?)(?:[./_-]|$)/i,
  ],
  [
    'Financial calculation code changed; check edge cases and existing saved simulations.',
    /^packages\/financial-engine\/src\//,
  ],
  [
    'Workflow definitions changed; review triggers and token permissions.',
    /^\.github\/workflows\//,
  ],
];

function commitSubject(commit) {
  const subject = commit?.commit?.message?.split(/\r?\n/, 1)[0]?.trim() || '';
  // Treat all repository-provided text as data. A code span prevents operative
  // mentions/issue references; remove backticks, HTML delimiters and controls.
  return [
    ...subject
      .replace(/[`<>\p{Cc}\p{Cf}]/gu, ' ')
      .replaceAll('#', '＃')
      .replaceAll('@', '＠')
      .trim(),
  ]
    .slice(0, 180)
    .join('');
}

export function renderDescription({ pr, files, commits, prUrl }) {
  const paths = files.flatMap(({ filename, previous_filename }) =>
    [filename, previous_filename].filter((path) => typeof path === 'string'),
  );
  const affected = matches
    .filter(([, pattern]) => paths.some((p) => pattern.test(p)))
    .map(([label]) => label);
  const testCount = files.filter(({ filename, previous_filename }) =>
    [filename, previous_filename].some((p) => typeof p === 'string' && tests.test(p)),
  ).length;
  const subjects = commits.map(commitSubject).filter(Boolean).slice(0, shownCommits);
  const risk = rolloutSignals
    .filter(([, pattern]) => paths.some((p) => pattern.test(p)))
    .map(([label]) => label);
  const total = pr.changed_files;
  const partial = files.length < total;
  const ui = affected.includes('App UI and navigation');
  const lines = [
    start,
    '',
    '## Summary',
    '',
    `- ${total} changed ${total === 1 ? 'file' : 'files'} · +${pr.additions} / −${pr.deletions} lines`,
    `- Areas: ${affected.length ? affected.join(', ') : 'Other repository files'}`,
    ...(partial
      ? [`- File-based notes cover the first ${files.length} of ${total} changed files.`]
      : []),
    ...(subjects.length
      ? [
          '',
          '**Commit highlights**',
          '',
          ...subjects.map((subject) => `- \`${subject}\``),
          ...(pr.commits > shownCommits ? [`- [See all commits](${prUrl}/commits)`] : []),
        ]
      : []),
    '',
    '## Related issues',
    '',
    'Uses only issue links confirmed in the PR description or GitHub sidebar. No issues are linked or closed automatically.',
    '',
    '## Verification',
    '',
    `- [View current CI checks](${prUrl}/checks). This description does not assert that tests passed.`,
    `- ${testCount === 1 ? '1 test file' : `${testCount} test files`} changed${partial ? ' among the files inspected' : ''}.`,
    ...(ui
      ? [
          '',
          '## UI evidence',
          '',
          'App files changed. Screenshots and device testing are not generated or inferred by this workflow.',
        ]
      : []),
    '',
    '## Risk and rollout',
    '',
    ...(risk.length
      ? risk.map((item) => `- ${item}`)
      : [
          '- No rollout flags detected in the inspected paths; review the diff for behavior and deployment impact.',
        ]),
    '',
    end,
  ];
  return lines.join('\n');
}

export function mergeDescription(body, block) {
  const existing = body ?? '';
  const first = existing.indexOf(start);
  const last = existing.indexOf(end);
  if (first === -1 && last === -1) return existing ? block + '\n\n' + existing : block;
  if (
    first < 0 ||
    last < first ||
    existing.lastIndexOf(start) !== first ||
    existing.lastIndexOf(end) !== last
  ) {
    // A malformed marker boundary must never cause deletion of maintainer text.
    return existing;
  }
  return existing.slice(0, first) + block + existing.slice(last + end.length);
}

export async function syncDescription({ event, env, fetchImpl = fetch }) {
  const repo = env.GITHUB_REPOSITORY;
  const token = env.GITHUB_TOKEN;
  const number = event?.number;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') ||
    !token ||
    !Number.isSafeInteger(number) ||
    number < 1
  ) {
    throw new Error('Missing or invalid PR workflow context');
  }
  const root = `/repos/${repo}/pulls/${number}`;
  const api = new URL(env.GITHUB_API_URL ?? 'https://api.github.com');
  const server = new URL(env.GITHUB_SERVER_URL ?? 'https://github.com');
  if (api.protocol !== 'https:' || server.protocol !== 'https:')
    throw new Error('Expected HTTPS GitHub URLs');
  const prUrl = new URL(`/${repo}/pull/${number}`, server).href;
  const request = async (path, patch) => {
    const response = await fetchImpl(new URL(api.href.replace(/\/$/, '') + path), {
      method: patch ? 'PATCH' : 'GET',
      redirect: 'error',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        ...(patch ? { 'content-type': 'application/json' } : {}),
      },
      body: patch ? JSON.stringify(patch) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub PR metadata request failed: HTTP ${response.status}`);
    return response.json();
  };
  const pr = await request(root);
  if (pr.state !== 'open' || pr.base?.ref !== 'main') return 'skipped';
  if (event.pull_request?.head?.sha !== pr.head?.sha) return 'stale';

  const files = [];
  for (let page = 1; files.length < Math.min(maxFiles, pr.changed_files); page++) {
    const batch = await request(`${root}/files?per_page=100&page=${page}`);
    files.push(...batch);
    if (batch.length < 100) break;
  }
  const commits = await request(`${root}/commits?per_page=${shownCommits}`);
  // Use the latest body so human notes added while reading metadata are retained.
  const latest = await request(root);
  if (
    latest.state !== 'open' ||
    latest.base?.ref !== 'main' ||
    latest.head?.sha !== pr.head?.sha ||
    latest.base?.sha !== pr.base?.sha ||
    latest.changed_files !== pr.changed_files
  )
    return 'stale';
  const block = renderDescription({ pr, files, commits, prUrl });
  const next = mergeDescription(latest.body, block);
  if (next === (latest.body ?? '')) return 'unchanged';
  // Never truncate existing user-authored text to make room for generated content.
  if (next.length > 65_536) return 'description too long';
  await request(root, { body: next });
  return 'updated';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  console.log('FINORA PR description:', await syncDescription({ event, env: process.env }));
}
