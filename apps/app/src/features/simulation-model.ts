import { loanSchema, zone, type LoanInput, type Method, type Product } from '@finora/contracts';

export type ScenarioFields = {
  principal: string;
  months: string;
  annualRate: string;
  firstDue: string;
  method: Method | '';
  fee: string;
};

export function nextDue(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export const simulatorDefaults = {
  amount: 30_000_000,
  months: 12,
} as const;

export function clampWithin(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function scenarioDefaults(
  product: Product | null,
  prefill: { amount?: string; months?: string; firstDue?: string } = {},
): ScenarioFields {
  const initial = (value: string | undefined, fallback: number, min: number, max: number) => {
    const target = value && /^\d+$/.test(value) ? Number(value) : fallback;
    return String(clampWithin(Number.isSafeInteger(target) ? target : fallback, min, max));
  };
  const date = loanSchema.shape.firstDue.safeParse(prefill.firstDue);
  return {
    principal: product
      ? initial(prefill.amount, simulatorDefaults.amount, product.amountMin, product.amountMax)
      : '',
    months: product
      ? initial(prefill.months, simulatorDefaults.months, product.monthsMin, product.monthsMax)
      : '',
    annualRate: product ? String(product.rateMin) : '',
    firstDue: product && date.success ? date.data : nextDue(),
    method: product?.method ?? '',
    fee: product?.fee == null ? '' : String(product.fee),
  };
}

export function normalizeIntegerInput(raw: string, locale: 'vi-VN' | 'en-US') {
  const value = raw.trim();
  const grouped = locale === 'vi-VN' ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/;
  if (grouped.test(value)) return value.replace(/[.,]/g, '');
  // Spaces are only valid as groups of three; never turn a typo like "1 2" into 12.
  return /^\d{1,3}(?:[ \u00a0\u202f]\d{3})+$/.test(value)
    ? value.replace(/[ \u00a0\u202f]/g, '')
    : value;
}

function parseInteger(raw: string | undefined) {
  return raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : NaN;
}

export function parseScenario(
  product: Product | null,
  form: Partial<ScenarioFields>,
): LoanInput | null {
  const rawRate = form.annualRate?.trim() ?? '';
  const parsed = loanSchema.safeParse({
    principal: parseInteger(form.principal),
    months: parseInteger(form.months),
    annualRate: /^\d+(?:[.,]\d+)?$/.test(rawRate) ? Number(rawRate.replace(',', '.')) : NaN,
    firstDue: form.firstDue?.trim(),
    method: product?.method ?? form.method,
    fee: product ? product.fee : form.fee?.trim() ? parseInteger(form.fee) : null,
  });
  if (!parsed.success) return null;
  const loan = parsed.data;
  if (
    product &&
    (loan.principal < product.amountMin ||
      loan.principal > product.amountMax ||
      loan.months < product.monthsMin ||
      loan.months > product.monthsMax ||
      loan.annualRate < product.rateMin ||
      loan.annualRate > product.rateMax)
  )
    return null;
  return loan;
}

export function commonScenarioBounds([a, b]: readonly [Product, Product]) {
  const amountMin = Math.max(a.amountMin, b.amountMin);
  const amountMax = Math.min(a.amountMax, b.amountMax);
  const monthsMin = Math.max(a.monthsMin, b.monthsMin);
  const monthsMax = Math.min(a.monthsMax, b.monthsMax);
  return amountMin <= amountMax && monthsMin <= monthsMax
    ? { amountMin, amountMax, monthsMin, monthsMax }
    : null;
}

export function matchedInputs(
  products: readonly [Product, Product],
  values: { amount: string; months: string; firstDue: string },
): readonly [LoanInput, LoanInput] | null {
  const input = (product: Product) =>
    parseScenario(product, {
      principal: values.amount,
      months: values.months,
      annualRate: String(product.rateMin),
      firstDue: values.firstDue,
    });
  const left = input(products[0]);
  const right = input(products[1]);
  return left && right ? [left, right] : null;
}

export function sameScenarioInput(a: LoanInput, b: LoanInput) {
  return (
    a.principal === b.principal &&
    a.months === b.months &&
    a.annualRate === b.annualRate &&
    a.method === b.method &&
    a.firstDue === b.firstDue &&
    a.fee === b.fee
  );
}
