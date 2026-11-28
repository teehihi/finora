import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { DocumentFieldName } from '@finora/contracts';
import { extractDocumentFields, type DocumentPageText } from '../src/modules/document-fields';

type Case = {
  id: string;
  split: 'development' | 'holdout';
  modality: string;
  pages: DocumentPageText[];
  expected: Partial<Record<DocumentFieldName, string | number | null>>;
  conflicts?: DocumentFieldName[];
};
const cases = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'document-evaluation.json'), 'utf8'),
) as Case[];
const money = new Set<DocumentFieldName>([
  'principal',
  'disbursementAmount',
  'monthlyRepayment',
  'totalRepayment',
  'totalFees',
  'serviceFee',
  'insuranceFee',
]);

function evaluate(split: Case['split']) {
  let tp = 0,
    fp = 0,
    fn = 0,
    citations = 0,
    validCitations = 0;
  let knownMoney = 0,
    exactMoney = 0,
    unknown = 0,
    handledUnknown = 0;
  let unsupportedClaims = 0,
    foundClaims = 0,
    conflicts = 0,
    matchedConflicts = 0;
  const latencies: number[] = [];
  const selected = cases.filter((item) => item.split === split);
  for (const item of selected) {
    const start = performance.now();
    const fields = extractDocumentFields(item.pages);
    latencies.push(performance.now() - start);
    for (const [key, expected] of Object.entries(item.expected) as [
      DocumentFieldName,
      string | number | null,
    ][]) {
      const actual = fields[key];
      if (expected === null) {
        unknown++;
        if (actual.value === null) handledUnknown++;
        else fp++;
      } else if (actual.value === expected) tp++;
      else {
        fn++;
        if (actual.value !== null) fp++;
      }
      if (money.has(key) && expected !== null) {
        knownMoney++;
        if (actual.value === expected) exactMoney++;
      }
    }
    for (const key of item.conflicts ?? []) {
      conflicts++;
      if (fields[key].state === 'conflicting') matchedConflicts++;
    }
    for (const field of Object.values(fields)) {
      if (field.state !== 'found') continue;
      foundClaims++;
      if (
        !field.sources.some((source) =>
          item.pages.some(
            (page) =>
              page.page === source.page &&
              page.text.split(/\r?\n/).some((line) => line.trim() === source.excerpt),
          ),
        )
      )
        unsupportedClaims++;
      for (const source of field.sources) {
        citations++;
        if (
          item.pages.some(
            (page) =>
              page.page === source.page &&
              page.text.split(/\r?\n/).some((line) => line.trim() === source.excerpt),
          )
        )
          validCitations++;
      }
    }
  }
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  return {
    split,
    documents: selected.length,
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    exactMoney: knownMoney ? exactMoney / knownMoney : 0,
    citationAccuracy: citations ? validCitations / citations : 0,
    unsupportedExtractionRate: foundClaims ? unsupportedClaims / foundClaims : 0,
    missingFieldHandling: unknown ? handledUnknown / unknown : 0,
    conflictDetection: conflicts ? matchedConflicts / conflicts : 0,
    medianLatencyMs: latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)] ?? 0,
    maxLatencyMs: Math.max(...latencies),
    note: 'Text and OCR transcripts only; OCR recognition and PDF decoding are not measured.',
  };
}

test.each(['development', 'holdout'] as const)('%s document field evaluation', (split) => {
  const result = evaluate(split);
  console.info('DOCUMENT_EVALUATION ' + JSON.stringify(result));
  expect(result.documents).toBeGreaterThan(0);
  expect(result.citationAccuracy).toBe(1);
  expect(result.unsupportedExtractionRate).toBe(0);
  expect(result.missingFieldHandling).toBe(1);
  expect(result.conflictDetection).toBe(1);
});
