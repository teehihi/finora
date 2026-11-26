import type { IntelligenceScenario } from '@finora/contracts';

function isControl(char: string) {
  const code = char.charCodeAt(0);
  return code < 32 || code === 127;
}

/** Only user-initiated, public HTTPS citations are linkable. */
export function safeSource(value: string | null | undefined): URL | null {
  if (
    !value ||
    !/^https:\/\//i.test(value) ||
    Array.from(value).some((char) => char === '\\' || isControl(char))
  )
    return null;
  try {
    const link = new URL(value);
    if (
      link.protocol !== 'https:' ||
      link.username ||
      link.password ||
      link.port ||
      !/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(link.hostname) ||
      !/[a-z]/i.test(link.hostname.split('.').at(-1) ?? '') ||
      /\.(?:local|localhost|internal|test|example|invalid)$/i.test(link.hostname)
    )
      return null;
    return link;
  } catch {
    return null;
  }
}

export function chooseSimulationId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}

/** Prefill as literal text only. Requires a separate Send action, even for a valid route. */
export function chooseDraftPrompt(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.slice(0, 2400))
    .filter((char) => !isControl(char) || char === '\t' || char === '\n' || char === '\r')
    .join('')
    .trim()
    .slice(0, 1200);
}

/** Only compare durations at the same terms, even for old conversation rows. */
export function compareIntelligenceDurations(
  left: IntelligenceScenario,
  right: IntelligenceScenario,
) {
  const comparable =
    left.months !== right.months &&
    left.principal === right.principal &&
    left.annualRate === right.annualRate &&
    left.method === right.method &&
    left.fee === right.fee &&
    left.firstDue === right.firstDue;
  const difference = (first: number | null, second: number | null) => {
    if (!comparable || first === null || second === null || first === second) return null;
    return {
      months: first < second ? left.months : right.months,
      amount: Math.abs(first - second),
    };
  };
  return {
    comparable,
    peak: difference(left.peakPayment, right.peakPayment),
    principalAndInterest: difference(left.repayment, right.repayment),
    allIn: difference(left.total, right.total),
  };
}

export function scenarioPressure(scenario: IntelligenceScenario) {
  if (scenario.remainingCash !== null && scenario.remainingCash <= 0) return 'baseline';
  if (scenario.stressRemainingCash !== null && scenario.stressRemainingCash <= 0) return 'stress';
  if (scenario.planningCapacity !== undefined)
    return scenario.peakPayment > scenario.planningCapacity ? 'above' : 'within';
  return null;
}
