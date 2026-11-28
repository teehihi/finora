import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { interpret, needsExternalTools } from '../src/modules/intelligence-rules.js';

type Case = { id: string; prompt: string };
type Label = {
  id: string;
  split: 'development' | 'holdout';
  expected: Record<string, number | string | boolean | null>;
  selectsTools: boolean;
};
const source = resolve('../../docs/evaluation');
const cases = JSON.parse(readFileSync(resolve(source, 'intelligence-vi.json'), 'utf8')) as Case[];
const labels = JSON.parse(
  readFileSync(resolve(source, 'phase6-intent-labels.json'), 'utf8'),
) as Label[];
if (new Set(labels.map((label) => label.id)).size !== labels.length)
  throw Error('Duplicate evaluation case ID');
if (
  !labels.some(({ split }) => split === 'development') ||
  !labels.some(({ split }) => split === 'holdout')
)
  throw Error('Both evaluation splits are required');
const byId = new Map(cases.map((item) => [item.id, item]));
const results = labels.map((label) => {
  const item = byId.get(label.id);
  if (!item) throw Error('Missing source case: ' + label.id);
  const started = performance.now();
  const intent = interpret(item.prompt);
  const selected = needsExternalTools(intent, item.prompt);
  const latencyMs = Math.round((performance.now() - started) * 1000) / 1000;
  const fields = Object.entries(label.expected).map(([field, expected]) => ({
    field,
    expected,
    actual: (intent as unknown as Record<string, unknown>)[field] ?? null,
    passed: ((intent as unknown as Record<string, unknown>)[field] ?? null) === expected,
  }));
  return {
    id: label.id,
    split: label.split,
    fields,
    toolSelection: {
      expected: label.selectsTools,
      actual: selected,
      passed: selected === label.selectsTools,
    },
    latencyMs,
  };
});
const report = {
  date: new Date().toISOString(),
  evaluator: 'local deterministic pre-orchestration intent parser; no network or LLM',
  dataset: 'intelligence-vi.json + phase6-intent-labels.json',
  splits: Object.fromEntries(
    ['development', 'holdout'].map((split) => {
      const group = results.filter((result) => result.split === split);
      const fields = group.flatMap((result) => result.fields);
      return [
        split,
        {
          cases: group.length,
          fieldAccuracy: {
            passed: fields.filter((field) => field.passed).length,
            total: fields.length,
          },
          toolSelectionAccuracy: {
            passed: group.filter((result) => result.toolSelection.passed).length,
            total: group.length,
          },
          meanLatencyMs:
            Math.round(
              (group.reduce((sum, result) => sum + result.latencyMs, 0) / group.length) * 1000,
            ) / 1000,
        },
      ];
    }),
  ),
  results,
};
const output = resolve('../../.data/evaluation/phase6-local-intent.json');
mkdirSync(resolve('../../.data/evaluation'), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({
    output,
    splits: report.splits,
    failedCaseIds: results
      .filter(
        (result) => result.fields.some((field) => !field.passed) || !result.toolSelection.passed,
      )
      .map(({ id }) => id),
  }),
);
