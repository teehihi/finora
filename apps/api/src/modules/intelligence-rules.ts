import {
  intelligenceBlocksSchema,
  loanSchema,
  profileSchema,
  type Estimate,
  type IntelligenceBlock,
  type IntelligenceScenario,
  type LoanInput,
  type Method,
  type Profile,
} from '@finora/contracts';
import { financialTools } from './tools.js';

export const normalizeVn = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/−/g, '-');
const amountPattern =
  '((?:[0-9]{1,3}(?:[.,][0-9]{3}){1,3}|[0-9]+(?:[.,][0-9]+)?))\\s*(trieu|tr\\b|million\\b|nghin|ngan|k\\b|thousand\\b|ty\\b|billion\\b)?';
function parseNumber(raw: string, unit?: string): number | undefined {
  const scale = /^(ty|billion)$/.test(unit ?? '')
    ? 1_000_000_000
    : /^(trieu|tr|million)$/.test(unit ?? '')
      ? 1_000_000
      : /^(nghin|ngan|k|thousand)$/.test(unit ?? '')
        ? 1_000
        : 0;
  if (scale === 0 && !/^\d+$|^\d{1,3}(?:[.,]\d{3})+$/.test(raw)) return undefined;
  // A scaled term such as "1.234 triệu" can mean 1.234 or 1,234 million
  // depending on locale. Do not use an ambiguous amount in a schedule.
  if (scale && /^[0-9]{1,3}(?:[.,][0-9]{3})+$/.test(raw)) return undefined;
  const n = Math.round(
    scale ? Number(raw.replace(',', '.')) * scale : Number(raw.replace(/[.,]/g, '')),
  );
  return Number.isSafeInteger(n) && (n === 0 || n >= 1000 || scale > 0) && n <= 1_000_000_000_000
    ? n
    : undefined;
}
function moneyAfter(prompt: string, label: string) {
  const r = new RegExp(
    '(?:^|[^a-z0-9])(?:' + label + ')\\s*(?:la|about|of|:|=)?\\s*' + amountPattern,
  ).exec(prompt);
  if (!r?.[1]) return undefined;
  return parseNumber(r[1], r[2]);
}
const purposeKeys = ['personal', 'education', 'home', 'vehicle', 'business'] as const;
export type IntentPurpose = (typeof purposeKeys)[number];
export type InputIssue = 'annualRate' | 'months' | 'method' | 'incomeCut' | 'extraExpense';
export const approvedPurposes = purposeKeys;
export type Intent = {
  income?: number;
  expenses?: number;
  debt?: number;
  savings?: number;
  principal?: number;
  principalDelta?: number;
  aprOnly?: boolean;
  annualRate?: number;
  monthlyQuoted?: boolean;
  months?: number;
  secondMonths?: number;
  method?: Method;
  fee?: number | null;
  incomeCut?: number;
  extraExpense?: number;
  expenseRisePercent?: number;
  resetStress?: boolean;
  inputIssues?: InputIssue[];
  knownPayment?: number;
  payoffAfter?: number;
  payoffFeeRate?: number;
  purpose?: IntentPurpose;
  isBorrowing: boolean;
  blocked: boolean;
  early: boolean;
};
const rates = (value?: string) => (value ? Number(value.replace(',', '.')) : undefined);
const validTerm = (v?: string) => (v && Number(v) >= 1 && Number(v) <= 360 ? Number(v) : undefined);
export function interpret(prompt: string): Intent {
  const s = normalizeVn(prompt);
  const inputIssues: InputIssue[] = [];
  const quotedRates = [
    ...s.matchAll(
      /(?:\blai(?: suat)?\b|interest(?: rate)?)\s*(?:la|of|doi thanh|doi sang|sang|change to|set to|:|=)?\s*(-?\d+(?:[.,]\d+)?)\s*%\s*(?:\/\s*)?(thang|month|nam|year)?/g,
    ),
  ];
  const m = quotedRates[0];
  const aprOnly = !m && /\b(?:apr|lai suat thuc te)\b/.test(s);
  const annualRates = quotedRates.map(([_, quote, period]) =>
    Number(
      (Number(quote.replace(',', '.')) * (/month|thang/.test(period ?? '') ? 12 : 1)).toFixed(4),
    ),
  );
  const rateRange =
    /(?:\blai(?: suat)?\b|interest(?: rate)?)\s*(?:la|of|:|=|tu|from)?\s*-?\d+(?:[.,]\d+)?\s*%?\s*(?:(?:\/\s*)?(?:thang|months?|nam|years?)\s*)?(?:va|hay|hoac|or|vs\.?|den|to|[-–—])\s*\d+(?:[.,]\d+)?\s*%/.test(
      s,
    );
  if (
    rateRange ||
    quotedRates.some(([, quote]) => (quote.split(/[.,]/)[1]?.length ?? 0) > 4) ||
    annualRates.some((rate) => rate < 0 || rate > 100) ||
    new Set(annualRates).size > 1
  )
    inputIssues.push('annualRate');
  const percent = inputIssues.includes('annualRate') ? undefined : annualRates[0];
  const pair =
    /(?<![\d.,-])(-?\d{1,6})(?:\s*(?:thang|months?)\b)?\s*(?:va|voi|vs\.?|or|hay|hoac|\/|so voi)\s*(-?\d{1,6})\s*(?:thang|months?)\b/.exec(
      s,
    );
  const single = /(?<![\d.,-])(-?\d{1,6})\s*(?:thang|months?)\b/.exec(s);
  const yr = /\b(\d{1,2}|mot|hai|ba|bon|nam|one|two|three|four|five)\s*(?:nam|years?)\b/.exec(s);
  const writtenYears: Record<string, number> = {
    mot: 1,
    hai: 2,
    ba: 3,
    bon: 4,
    nam: 5,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };
  const yearsInMonths = yr ? String((writtenYears[yr[1]] ?? Number(yr[1])) * 12) : undefined;
  const incomeShock =
    '\\b(?:thu nhap|luong|income)(?:\\s+(?:thang toi|thang sau|moi thang|hang thang|next month))?\\s*(?:giam|mat|drops?|falls?|decreases?)\\b';
  const incomeCuts = [
    ...s.matchAll(new RegExp(incomeShock + '\\s*(?:by\\s*)?(-?\\d+(?:[.,]\\d+)?)\\s*%', 'g')),
  ].map((match) => Number(match[1].replace(',', '.')));
  if (
    (!incomeCuts.length && new RegExp(incomeShock).test(s)) ||
    incomeCuts.some((cut) => cut < 0 || cut > 100) ||
    new Set(incomeCuts).size > 1
  )
    inputIssues.push('incomeCut');
  const expenseLabel =
    'chi phi(?: sinh hoat| thiet yeu| moi thang)? tang(?: them)?|chi tieu(?: hang thang| moi thang)? tang(?: them)?|extra monthly costs|(?:living |monthly )?expenses increase by';
  const expenseRaises = [
    ...s.matchAll(
      new RegExp('(?:^|[^a-z0-9])(?:' + expenseLabel + ')\\s*(-?\\d+(?:[.,]\\d+)?)\\s*%', 'g'),
    ),
  ].map((match) => Number(match[1].replace(',', '.')));
  const extraExpense = moneyAfter(
    s.replace(new RegExp('(?:' + expenseLabel + ')\\s*-?\\d+(?:[.,]\\d+)?\\s*%', 'g'), ''),
    expenseLabel,
  );
  if (
    (!expenseRaises.length &&
      extraExpense === undefined &&
      new RegExp('\\b(?:' + expenseLabel + ')\\b').test(s)) ||
    expenseRaises.some((increase) => increase < 0 || increase > 1000) ||
    new RegExp('(?:' + expenseLabel + ')\\s*-\\d+').test(s) ||
    new Set(expenseRaises).size > 1 ||
    (expenseRaises.length > 0 && extraExpense !== undefined)
  )
    inputIssues.push('extraExpense');
  const purpose = /\b(mua xe|xe may|o to|vehicle|car|motorbike)\b/.test(s)
    ? 'vehicle'
    : /\b(hoc phi|hoc tap|study|tuition|education)\b/.test(s)
      ? 'education'
      : /\b(mua nha|sua nha|home|housing|mortgage)\b/.test(s)
        ? 'home'
        : /\b(kinh doanh|business)\b/.test(s)
          ? 'business'
          : /\b(tieu dung|ca nhan|personal)\b/.test(s)
            ? 'personal'
            : undefined;
  const methods = [
    [/\b(tra gop deu|annuity|equal installments)\b/, 'annuity'],
    [/\b(goc deu|equal principal)\b/, 'equalPrincipal'],
    [/\b(lai phang|du no ban dau|flat(?: interest| rate)?)\b/, 'flat'],
  ] as const;
  const mentionedMethods = methods.filter(([pattern]) => pattern.test(s));
  if (mentionedMethods.length > 1) inputIssues.push('method');
  const method = mentionedMethods.length === 1 ? mentionedMethods[0][1] : undefined;
  const early = /tra truoc han|tat toan som|early repayment|repay early/.test(s);
  const payoffAfter = early
    ? validTerm(
        /(?:sau ky|sau thang|vao ky|thang thu|after month|after payment)\s*(\d{1,3})/.exec(
          s,
        )?.[1] ?? /(?:sau|after)\s*(\d{1,3})\s*(?:thang|months?)/.exec(s)?.[1],
      )
    : undefined;
  const payoffFeeRate = early
    ? /(?:khong phi|mien phi) (?:tat toan|tra truoc)|no early repayment fee/.test(s)
      ? 0
      : rates(
          /(?:phi|phat) (?:tat toan|tra truoc)(?: som| han)?\s*(?:la|:)?\s*(\d+(?:[.,]\d{1,4})?)\s*%/.exec(
            s,
          )?.[1],
        )
    : undefined;
  const lowerPrincipal = moneyAfter(s, 'vay it hon|giam so tien vay(?: di)?|borrow less(?: by)?');
  const higherPrincipal = moneyAfter(
    s,
    'vay nhieu hon|tang so tien vay(?: them)?|borrow more(?: by)?',
  );
  const principalDelta = lowerPrincipal !== undefined ? -lowerPrincipal : higherPrincipal;
  const rawTerm =
    pair?.[1] ??
    (early && validTerm(single?.[1]) === payoffAfter ? undefined : single?.[1]) ??
    yearsInMonths;
  if (
    (rawTerm !== undefined && !validTerm(rawTerm)) ||
    (pair?.[2] !== undefined && !validTerm(pair[2])) ||
    /\b\d+[.,]\d+\s*(?:thang|months?)\b/.test(s)
  )
    inputIssues.push('months');
  return {
    income: moneyAfter(
      s,
      'luong(?: moi thang| hang thang)?|thu nhap(?: moi thang| hang thang)?|monthly income|income',
    ),
    expenses: moneyAfter(
      s,
      'chi phi(?: sinh hoat| thiet yeu| moi thang)?|chi tieu|monthly expenses|expenses',
    ),
    debt: /\b(khong co no|khong tra no hien tai|no existing debt)\b/.test(s)
      ? 0
      : moneyAfter(
          s,
          'no hien tai|(?:dang )?tra no(?: moi thang| hang thang| hien tai)?|tien tra no(?: hien tai)?|existing debt|debt payments',
        ),
    savings: moneyAfter(s, 'tiet kiem du phong|quy du phong|emergency savings'),
    principalDelta,
    aprOnly,
    principal:
      principalDelta !== undefined
        ? undefined
        : moneyAfter(
            s,
            'vay(?: khoang| them)?|khoan vay|so tien vay|tim khoan|borrow(?:ing)?|loan amount|principal',
          ),
    annualRate: percent !== undefined && percent <= 100 ? Number(percent.toFixed(4)) : undefined,
    monthlyQuoted: /month|thang/.test(m?.[2] ?? ''),
    months: validTerm(rawTerm),
    secondMonths: validTerm(pair?.[2]),
    method,
    fee: early
      ? moneyAfter(s, 'phi mot lan|phi ho so|phi dich vu|one-time fee')
      : /\b(khong phi|mien phi|no fee)\b/.test(s)
        ? 0
        : /\b(?:chua biet|khong ro|khong biet) (?:muc )?phi\b|\b(?:fee unknown|unknown fee)\b/.test(
              s,
            )
          ? null
          : moneyAfter(s, 'phi mot lan|phi ho so|phi dich vu|one-time fee|fee'),
    incomeCut: inputIssues.includes('incomeCut') ? undefined : incomeCuts[0],
    extraExpense: inputIssues.includes('extraExpense') ? undefined : extraExpense,
    expenseRisePercent: inputIssues.includes('extraExpense') ? undefined : expenseRaises[0],
    resetStress:
      /\b(?:bo (?:gia dinh|kich ban) bien dong|khong ap dung bien dong|reset stress|remove stress|without stress)\b/.test(
        s,
      ),
    ...(inputIssues.length ? { inputIssues } : {}),
    knownPayment: moneyAfter(s, 'khoan tra|tra them|tra hang thang|monthly payment|payment of'),
    payoffAfter,
    payoffFeeRate: payoffFeeRate !== undefined && payoffFeeRate <= 100 ? payoffFeeRate : undefined,
    purpose,
    isBorrowing:
      /vay|borrow|loan|lai|interest|repay|tra no|khoan tra|tra them|chi phi|cash flow/.test(s) ||
      !!purpose,
    blocked:
      /(?:ignore|disregard|override|bo qua|ghi de).{0,28}(?:instruction|chi dan|huong dan|quy tac|rule|system|kiem soat)|(?:system prompt|api key|secret key|khoa bi mat|arbitrary sql)|(?:du lieu|data|ho so).{0,24}(?:nguoi khac|tai khoan khac|other user|another account)|(?:execute|chay|thuc thi).{0,18}(?:sql|shell|terminal|script)|\b(?:duyet chac chan|chac chan duoc duyet|guarantee approval|guaranteed approval)\b/.test(
        s,
      ),
    early,
  };
}
export function redactExternalPrompt(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/\b(?:\+?\d[ ()-]*){9,}\b/g, '[personal number]')
    .slice(0, 1000);
}
export function buildProfile(intent: Intent, persisted: Profile | null) {
  // Individual explicit amounts can update a scenario without ever writing the stored profile.
  const raw = {
    income: intent.income ?? persisted?.income,
    expenses: intent.expenses ?? persisted?.expenses,
    debt: intent.debt ?? persisted?.debt,
  };
  const parsed = profileSchema.safeParse(raw);
  const basis = Object.values([intent.income, intent.expenses, intent.debt]).some(
    (v) => v !== undefined,
  )
    ? 'user'
    : 'profile';
  return {
    profile: parsed.success ? parsed.data : null,
    basis: basis as 'user' | 'profile',
    missing: (['income', 'expenses', 'debt'] as const).filter(
      (k) => raw[k] === undefined || (k === 'income' && raw[k] === 0),
    ),
  };
}
export function snapshotOf(plan: IntelligenceScenario, firstDue: string): LoanInput {
  return {
    principal: plan.principal,
    annualRate: plan.annualRate,
    months: plan.months,
    method: plan.method,
    fee: plan.fee,
    firstDue,
  };
}
export function scenarioInput(
  intent: Intent,
  existing: LoanInput | undefined,
  firstDue: string,
  months?: number,
) {
  return loanSchema.safeParse({
    principal: intent.principal ?? existing?.principal,
    months: months ?? intent.months ?? existing?.months,
    annualRate: intent.annualRate ?? existing?.annualRate,
    method: intent.method ?? existing?.method,
    fee: intent.fee !== undefined ? intent.fee : (existing?.fee ?? null),
    firstDue: existing?.firstDue ?? firstDue,
  });
}
export function toAffordability(
  profile: Profile,
  basis: 'user' | 'profile',
  savings?: number,
): IntelligenceBlock {
  const calc = financialTools.analyzeFinancialProfile(profile);
  return {
    kind: 'affordability',
    ...profile,
    basis,
    cashFlow: profile.income - profile.debt - profile.expenses,
    monthlyCapacity: calc.monthlyBudget,
    debtRatio: calc.debtToIncome,
    emergencyMonths:
      savings !== undefined && profile.expenses + profile.debt > 0
        ? Math.round((savings / (profile.expenses + profile.debt)) * 10) / 10
        : null,
  };
}
export function stressBudget(profile: Profile, intent: Intent) {
  if (
    intent.incomeCut === undefined &&
    intent.extraExpense === undefined &&
    intent.expenseRisePercent === undefined
  )
    return null;
  const stressedIncome = Math.round(profile.income * (1 - (intent.incomeCut ?? 0) / 100));
  const monthlyExpenseIncrease =
    intent.extraExpense ?? Math.round((profile.expenses * (intent.expenseRisePercent ?? 0)) / 100);
  return {
    cashFlow: stressedIncome - profile.debt - profile.expenses - monthlyExpenseIncrease,
    basis: {
      incomeReductionPercent: intent.incomeCut ?? null,
      expenseIncreasePercent: intent.expenseRisePercent ?? null,
      monthlyIncomeLoss: profile.income - stressedIncome,
      monthlyExpenseIncrease,
    },
  };
}
export function toScenario(
  input: LoanInput,
  result: Estimate,
  intent: Intent,
  profile: Profile | null,
  snapshotId?: string,
): IntelligenceScenario {
  const peak = Math.max(...result.schedule.map((p) => p.payment));
  const remaining = profile ? profile.income - profile.debt - profile.expenses - peak : null;
  const stress = profile ? stressBudget(profile, intent) : null;
  return {
    kind: 'scenario',
    principal: input.principal,
    months: input.months,
    firstDue: input.firstDue,
    annualRate: input.annualRate,
    method: input.method,
    fee: input.fee,
    firstPayment: result.firstPayment,
    peakPayment: peak,
    repayment: result.repayment,
    total: result.total,
    remainingCash: remaining,
    stressRemainingCash: stress ? stress.cashFlow - peak : null,
    ...(profile
      ? { planningCapacity: financialTools.analyzeFinancialProfile(profile).monthlyBudget }
      : {}),
    ...(stress ? { stressBasis: stress.basis } : {}),
    source: snapshotId ? 'saved_simulation' : 'user_assumptions',
    ...(snapshotId ? { simulationId: snapshotId } : {}),
  };
}
export function priorScenario(blocks: unknown) {
  const parsed = intelligenceBlocksSchema.safeParse(blocks);
  return parsed.success
    ? parsed.data.find((block): block is IntelligenceScenario => block.kind === 'scenario')
    : undefined;
}
