import type { Estimate, LoanInput } from '@finora/contracts';

type Simulation = { input: LoanInput; result: Estimate };

export function formatVndDraft(value: string, locale: 'vi-VN' | 'en-US') {
  if (!/^\d+$/.test(value)) return value;
  const separator = locale === 'vi-VN' ? '.' : ',';
  return value.replace(/\B(?=(?:\d{3})+(?!\d))/g, separator);
}

export function compareScenarioBurden(baseline: Simulation, current: Simulation) {
  const { input: a, result: earlier } = baseline;
  const { input: b, result: latest } = current;
  const samePrincipal = a.principal === b.principal;
  const rateOrMethodChanged = a.annualRate !== b.annualRate || a.method !== b.method;
  const firstDelta = latest.firstPayment - earlier.firstPayment;
  const peak = (result: Estimate) =>
    result.schedule.reduce((max, row) => Math.max(max, row.payment), 0);
  const peakDelta = peak(latest) - peak(earlier);
  const unknownFees = earlier.total === null || latest.total === null;
  const totalDelta =
    samePrincipal && earlier.total !== null && latest.total !== null
      ? latest.total - earlier.total
      : null;
  const tradeoff =
    totalDelta === null
      ? null
      : peakDelta < 0 && totalDelta > 0
        ? 'lowerPeakHigherTotal'
        : peakDelta > 0 && totalDelta < 0
          ? 'higherPeakLowerTotal'
          : peakDelta === 0
            ? 'samePeak'
            : null;
  return {
    samePrincipal,
    rateOrMethodChanged,
    dateChanged: a.firstDue !== b.firstDue,
    firstDelta,
    peakDelta,
    unknownFees,
    totalDelta,
    tradeoff,
  };
}
