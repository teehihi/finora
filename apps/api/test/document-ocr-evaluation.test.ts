import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { DocumentFieldName, DocumentMime } from '@finora/contracts';
import { analyzeDocument } from '../src/modules/document-extraction';

const ready =
  !!process.env.DOCUMENT_OCR_LANGS &&
  ['tesseract', 'pdftoppm', 'pdftotext'].every(
    (tool) => !spawnSync(tool, ['-v'], { timeout: 3_000 }).error,
  );
type Case = {
  name: string;
  mime: DocumentMime;
  split: 'development' | 'holdout';
  expected: Partial<Record<DocumentFieldName, string | number | null>>;
  evidence: Partial<Record<DocumentFieldName, { page: number; contains: string }>>;
  conflicts?: DocumentFieldName[];
};
const cases: Case[] = [
  {
    name: 'vi-scan.png',
    mime: 'image/png',
    split: 'development',
    expected: {
      principal: 30_000_000,
      months: 24,
      annualRate: 12.5,
      method: 'annuity',
      totalFees: null,
    },
    evidence: {
      principal: { page: 1, contains: '30.000.000 VND' },
      months: { page: 1, contains: '24 tháng' },
      annualRate: { page: 1, contains: '12,5%' },
      method: { page: 1, contains: 'Trả góp đều' },
    },
  },
  {
    name: 'vi-scan.pdf',
    mime: 'application/pdf',
    split: 'development',
    expected: { principal: 30_000_000, serviceFee: 120_000, insuranceFee: 0, earlyRepaymentFee: 2 },
    evidence: {
      principal: { page: 1, contains: '30.000.000 VND' },
      months: { page: 1, contains: '24 tháng' },
      annualRate: { page: 1, contains: '12,5%' },
      method: { page: 1, contains: 'Trả góp đều' },
      serviceFee: { page: 2, contains: '120.000 VND' },
      insuranceFee: { page: 2, contains: '0 VND' },
      earlyRepaymentFee: { page: 2, contains: '2%' },
    },
  },
  {
    name: 'vi-noisy.jpg',
    mime: 'image/jpeg',
    split: 'holdout',
    expected: {
      principal: 30_000_000,
      months: 24,
      annualRate: 12.5,
      method: 'annuity',
      totalFees: null,
    },
    evidence: {
      principal: { page: 1, contains: '30.000.000 VND' },
      months: { page: 1, contains: '24 tháng' },
      annualRate: { page: 1, contains: '12,5%' },
      method: { page: 1, contains: 'Trả góp đều' },
    },
  },
  {
    name: 'vi-incomplete.png',
    mime: 'image/png',
    split: 'holdout',
    expected: { principal: null, months: 12, serviceFee: null, annualRate: null },
    evidence: { months: { page: 1, contains: '12 tháng' } },
  },
  {
    name: 'vi-conflict.pdf',
    mime: 'application/pdf',
    split: 'holdout',
    expected: { principal: null, totalFees: null },
    evidence: {},
    conflicts: ['principal'],
  },
];
const money = new Set<DocumentFieldName>([
  'principal',
  'disbursementAmount',
  'monthlyRepayment',
  'totalRepayment',
  'totalFees',
  'serviceFee',
  'insuranceFee',
]);

(ready ? describe : describe.skip)('measured OCR on synthetic financial images', () => {
  test.each(['development', 'holdout'] as const)(
    '%s set',
    async (split) => {
      let tp = 0,
        fp = 0,
        fn = 0,
        moneyExact = 0,
        moneyTotal = 0;
      let cited = 0,
        correctCitations = 0,
        missing = 0,
        handledMissing = 0;
      let conflicts = 0,
        detectedConflicts = 0;
      let foundClaims = 0,
        unsupportedClaims = 0;
      const latencies: number[] = [];
      for (const item of cases.filter((entry) => entry.split === split)) {
        const bytes = readFileSync(join(__dirname, 'fixtures', item.name));
        const start = performance.now();
        const result = await analyzeDocument(bytes, item.mime);
        latencies.push(performance.now() - start);
        for (const [name, expected] of Object.entries(item.expected) as [
          DocumentFieldName,
          string | number | null,
        ][]) {
          const actual = result.fields[name];
          if (expected === null) {
            missing++;
            if (actual.value === null) handledMissing++;
            else fp++;
          } else if (actual.value === expected) tp++;
          else {
            fn++;
            if (actual.value !== null) fp++;
          }
          if (money.has(name) && expected !== null) {
            moneyTotal++;
            if (actual.value === expected) moneyExact++;
          }
        }
        for (const [name, expected] of Object.entries(item.evidence) as [
          DocumentFieldName,
          { page: number; contains: string },
        ][]) {
          cited++;
          if (
            result.fields[name].sources.some(
              (source) =>
                source.page === expected.page &&
                source.excerpt.includes(expected.contains) &&
                source.bbox &&
                source.bbox.width > 0 &&
                source.bbox.height > 0,
            )
          )
            correctCitations++;
        }
        for (const [name, field] of Object.entries(result.fields) as [
          DocumentFieldName,
          (typeof result.fields)[DocumentFieldName],
        ][]) {
          if (field.state !== 'found') continue;
          foundClaims++;
          const expected = item.evidence[name];
          if (
            !expected ||
            !field.sources.some(
              (source) =>
                source.page === expected.page &&
                source.excerpt.includes(expected.contains) &&
                source.bbox &&
                source.bbox.width > 0 &&
                source.bbox.height > 0,
            )
          )
            unsupportedClaims++;
        }
        for (const name of item.conflicts ?? []) {
          conflicts++;
          if (
            result.fields[name].state === 'conflicting' &&
            result.fields[name].sources.map((source) => source.page).join(',') === '1,2'
          )
            detectedConflicts++;
        }
      }
      const precision = tp + fp ? tp / (tp + fp) : 0;
      const recall = tp + fn ? tp / (tp + fn) : 0;
      const metrics = {
        split,
        documents: cases.filter((entry) => entry.split === split).length,
        precision,
        recall,
        f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
        moneyExactMatch: moneyTotal ? moneyExact / moneyTotal : 0,
        evidenceCitationAccuracy: cited ? correctCitations / cited : 0,
        unsupportedExtractionRate: foundClaims ? unsupportedClaims / foundClaims : 0,
        missingFieldHandling: missing ? handledMissing / missing : 0,
        conflictDetection: conflicts ? detectedConflicts / conflicts : 0,
        medianLatencyMs: latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)],
        maxLatencyMs: Math.max(...latencies),
      };
      console.info('DOCUMENT_OCR_EVALUATION ' + JSON.stringify(metrics));
      expect(metrics.documents).toBeGreaterThan(0);
      expect(metrics.missingFieldHandling).toBe(1);
    },
    90_000,
  );
});
