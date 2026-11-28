import {
  loanSchema,
  type IntelligenceBlock,
  type LoanInput,
  type Profile,
  type TwinProjection,
  type TwinScenario,
  type TwinState,
} from '@finora/contracts';
import { compareDigitalTwin } from '@finora/financial-engine';
import { moneyAfter, normalizeVn, type Intent } from './intelligence-rules.js';
import { analysisBlocks } from './intelligence-context.js';

const amount = (n: number | undefined | null) =>
  n === undefined || n === null ? null : { amount: n, source: 'user_estimate' as const };
const summary = (projection: TwinProjection) => ({
  months: projection.months.length,
  resilience: projection.resilience,
  firstCashShortfall: projection.firstCashShortfall,
  stressedPeriods: projection.stressedPeriods,
  minimumCashFlow: projection.months.length
    ? Math.min(...projection.months.map((m) => m.netCashFlow ?? 0))
    : null,
  finalSavings: projection.months.at(-1)?.accumulatedSavings ?? null,
});
export function wantsFinancialTwin(prompt: string, selected: boolean) {
  return (
    selected ||
    /digital twin|du phong dong tien|future cash flow|what happens if|dieu gi xay ra neu|mat viec|that nghiep|lose my job|unemploy|trong suot khoan vay|throughout the loan|early repayment of|tra truoc (?:so tien|them)\b|(?:compare|so sanh).*\d+[- ]?\s*(?:month|thang).*\d+[- ]?\s*(?:month|thang)/u.test(
      normalizeVn(prompt),
    )
  );
}

export function financialTwinFromIntent(input: {
  prompt: string;
  intent: Intent;
  profile: Profile | null;
  loan: LoanInput | undefined;
  simulationId: string | null;
  history: { blocks: unknown }[];
}): {
  block: Extract<IntelligenceBlock, { kind: 'digital_twin' }> | null;
  missing: string[];
  notes: string[];
} {
  const { intent, profile, loan, simulationId, history } = input;
  const prior = history.flatMap((row) =>
    analysisBlocks(row.blocks).filter((block) => block.kind === 'digital_twin'),
  )[0];
  const priorState = prior?.state;
  const state: TwinState = {
    monthlyIncome: amount(intent.income) ?? priorState?.monthlyIncome ?? amount(profile?.income),
    incomeStability: intent.incomeStability ?? priorState?.incomeStability ?? null,
    essentialExpenses: amount(intent.essentialExpenses) ?? priorState?.essentialExpenses ?? null,
    discretionaryExpenses:
      amount(intent.discretionaryExpenses) ?? priorState?.discretionaryExpenses ?? null,
    existingDebtPayments:
      amount(intent.debt) ?? priorState?.existingDebtPayments ?? amount(profile?.debt),
    currentSavings: amount(intent.currentSavings) ?? priorState?.currentSavings ?? null,
    emergencyFund: amount(intent.savings) ?? priorState?.emergencyFund ?? null,
    events: priorState?.events ?? [],
  };
  const missing: string[] = (
    ['monthlyIncome', 'essentialExpenses', 'discretionaryExpenses', 'existingDebtPayments'] as const
  ).filter((key) => state[key] === null);
  if (!loanSchema.safeParse(loan).success) missing.push('loanTerms');
  const s = normalizeVn(input.prompt);
  const start = Number(
    /(?:bat dau|starting|from)\s*(?:ky|thang|month)?\s*(\d{1,3})\b/.exec(s)?.[1] ?? 1,
  );
  const durationWord =
    /(?:trong|for)\s*(\d{1,3}|mot|hai|ba|bon|one|two|three|four)\s*(?:thang|months?)\b/.exec(
      s,
    )?.[1];
  const duration = durationWord
    ? ((
        { mot: 1, hai: 2, ba: 3, bon: 4, one: 1, two: 2, three: 3, four: 4 } as Record<
          string,
          number
        >
      )[durationWord] ?? Number(durationWord))
    : NaN;
  const validStart = Number.isInteger(start) && start >= 1 && start <= 360;
  const shocks: TwinScenario['shocks'] = [];
  const notes: string[] = [];
  const length = loan?.months ?? 360;
  const span =
    Number.isInteger(duration) && duration >= 1 && duration <= 360
      ? duration
      : Math.max(1, length - start + 1);
  if (intent.incomeCut !== undefined)
    shocks.push({
      kind: 'incomeReduction',
      startMonth: start,
      durationMonths: span,
      percent: intent.incomeCut,
    });
  const unemployment = /mat viec|that nghiep|lose my job|unemploy/u.test(s);
  if (unemployment) {
    if (!Number.isInteger(duration) || duration < 1 || duration > 360)
      missing.push('unemploymentDuration');
    else shocks.push({ kind: 'unemployment', startMonth: start, durationMonths: duration });
  }
  const unexpected = moneyAfter(s, 'chi phi bat ngo|unexpected expenses?');
  if (intent.extraExpense !== undefined || unexpected !== undefined)
    shocks.push({
      kind: 'unexpectedExpense',
      startMonth: start,
      amount: intent.extraExpense ?? unexpected!,
    });
  if (intent.expenseRisePercent !== undefined)
    shocks.push({
      kind: 'expenseInflation',
      startMonth: start,
      durationMonths: span,
      percent: intent.expenseRisePercent,
    });
  const debt = moneyAfter(s, 'khoan tra no them|additional debt payment');
  if (debt !== undefined)
    shocks.push({
      kind: 'additionalDebt',
      startMonth: start,
      durationMonths: span,
      monthlyPayment: debt,
    });
  const earlyAmount = intent.early
    ? moneyAfter(s, 'tra truoc(?: han)?(?: them| so tien)?|repay(?:ing)?(?: an)?(?: extra)?')
    : undefined;
  if (intent.early && earlyAmount !== undefined) {
    if (intent.payoffAfter === undefined) missing.push('earlyRepaymentMonth');
    else
      shocks.push({
        kind: 'earlyRepayment',
        startMonth: intent.payoffAfter,
        amount: earlyAmount,
        fee: null,
      });
  }
  const comparedTerms =
    /(?:compare|so sanh)\s*(\d{1,3})\s*[- ]?\s*(?:month|thang)\s*(?:and|va|voi|vs\.?|or|hay)\s*(\d{1,3})\s*[- ]?\s*(?:month|thang)/.exec(
      s,
    );
  const alternativeTerm =
    intent.secondMonths ?? (comparedTerms ? Number(comparedTerms[2]) : undefined);
  const alternatePrincipal =
    intent.principalDelta !== undefined && loan
      ? loan.principal + intent.principalDelta
      : undefined;
  const alternativeLoan = {
    ...(alternativeTerm && loan && alternativeTerm !== loan.months
      ? { months: alternativeTerm }
      : {}),
    ...(alternatePrincipal && alternatePrincipal > 0 ? { principal: alternatePrincipal } : {}),
  };
  if (!shocks.length && !Object.keys(alternativeLoan).length && !missing.length)
    missing.push('scenario');
  if (intent.incomeCut !== undefined && !Number.isInteger(duration))
    notes.push('income_reduction_assumed_to_term_end');
  if (!validStart) missing.push('startMonth');
  if (loan && start > loan.months) missing.push('startMonth');
  if (loan && intent.early && intent.payoffAfter && intent.payoffAfter > loan.months)
    missing.push('earlyRepaymentMonth');
  if (missing.length || !loan || !validStart) return { block: null, missing, notes };
  const scenario: TwinScenario = {
    shocks,
    ...(Object.keys(alternativeLoan).length ? { alternativeLoan } : {}),
  };
  const result = compareDigitalTwin({ state, loan, scenarios: [scenario] });
  const stressed = result.alternatives[0];
  return {
    block: {
      kind: 'digital_twin',
      state,
      scenario,
      simulationId,
      baseline: summary(result.baseline),
      stressed: {
        ...summary(stressed),
        reserveDepletionMonth: stressed.reserveDepletionMonth,
        unknownCosts: stressed.unknownCosts,
        hypotheticalEarlyRepayment: stressed.hypotheticalEarlyRepayment,
        missing: stressed.missing,
      },
    },
    missing: [],
    notes,
  };
}
