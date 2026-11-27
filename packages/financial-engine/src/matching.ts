import Decimal from 'decimal.js';
import {
  loanMatchInputSchema,
  loanMatchResultSchema,
  matchPolicySchema,
  loanSchema,
  type LoanMatchEntry,
  type LoanMatchInput,
  type LoanMatchResult,
  type MatchPolicy,
  type MatchReason,
  type PublicLoanProduct,
} from '@finora/contracts';
import { affordability, simulate } from './index.js';

export const DEFAULT_MATCH_POLICY: MatchPolicy = {
  weights: {
    monthlyAffordability: 35,
    totalCost: 25,
    resilience: 20,
    termSuitability: 10,
    transparency: 10,
  },
  affordabilityTarget: 0.35,
  incomeStressPercent: 20,
};

const bounded = (value: number) => Math.max(0, Math.min(100, value));
const rounded = (value: number) => Math.round(value * 100) / 100;
function fixedAnnualRate(product: PublicLoanProduct): number | null {
  const rate = product.rate;
  if (!rate || rate.min === null || rate.max === null || rate.min !== rate.max) return null;
  if (rate.basis === 'unknown' || product.method === null) return null;
  if (rate.basis === 'flat' && product.method !== 'flat') return null;
  if (rate.basis === 'declining' && product.method === 'flat') return null;
  const annual = new Decimal(rate.min).times(rate.period === 'month' ? 12 : 1);
  return annual.lte(100) && annual.decimalPlaces() <= 4 ? annual.toNumber() : null;
}
function condition(value: boolean | null): 'met' | 'not_met' | 'unknown' {
  return value === null ? 'unknown' : value ? 'met' : 'not_met';
}
function rangeCondition(value: number, min: number | null, max: number | null) {
  if ((min !== null && value < min) || (max !== null && value > max)) return 'not_met' as const;
  return min === null || max === null ? ('unknown' as const) : ('met' as const);
}
const statusOrder = { suitable: 0, insufficient_information: 1, unsuitable: 2 } as const;

/** Pure MCDA policy over reviewed terms. Only simulate/affordability compute loan figures. */
export function matchLoans(
  raw: LoanMatchInput,
  products: readonly PublicLoanProduct[],
  proposedPolicy: MatchPolicy = DEFAULT_MATCH_POLICY,
): LoanMatchResult {
  const { request, profile } = loanMatchInputSchema.parse(raw);
  const policy = matchPolicySchema.parse(proposedPolicy);
  const incomeStressPercent = request.incomeStressPercent ?? policy.incomeStressPercent;
  const monthly = profile ? affordability(profile, policy.affordabilityTarget).monthlyBudget : null;
  const entries = products.map((product) => {
    const conditions: LoanMatchEntry['conditions'] = [
      {
        key: 'amount',
        status: rangeCondition(request.amount, product.amountMin, product.amountMax),
      },
      { key: 'term', status: rangeCondition(request.months, product.monthsMin, product.monthsMax) },
      {
        key: 'purpose',
        status: condition(request.category ? product.category === request.category : null),
      },
      { key: 'published_eligibility', status: product.eligibility.length ? 'unknown' : 'met' },
    ];
    const reasons: MatchReason[] = [];
    for (const entry of conditions) {
      if (entry.key === 'amount' && entry.status === 'not_met') reasons.push('amount_outside');
      if (entry.key === 'term' && entry.status === 'not_met') reasons.push('term_outside');
      if (entry.key === 'purpose' && entry.status === 'not_met') reasons.push('purpose_outside');
      if (entry.key === 'purpose' && entry.status === 'unknown') reasons.push('purpose_unknown');
      if (entry.key === 'amount' && entry.status === 'unknown') reasons.push('amount_unknown');
      if (entry.key === 'term' && entry.status === 'unknown') reasons.push('term_unknown');
      if (entry.key === 'published_eligibility' && entry.status === 'unknown')
        reasons.push('eligibility_unverified');
    }
    const eligibility = conditions.some((entry) => entry.status === 'not_met')
      ? 'does_not_meet_known_conditions'
      : conditions.some((entry) => entry.status === 'unknown')
        ? 'insufficient_information'
        : 'meets_known_conditions';
    const annualRate = fixedAnnualRate(product);
    if (annualRate === null) reasons.push('rate_unknown');
    if (product.method === null) reasons.push('method_unknown');
    if (product.fee === null) reasons.push('fees_unknown');
    if (product.insuranceFee === null) reasons.push('insurance_unknown');
    if (!profile) reasons.push('profile_missing');
    const fee =
      product.fee !== null && product.insuranceFee !== null
        ? new Decimal(product.fee).plus(product.insuranceFee).toNumber()
        : null;
    const loan =
      annualRate !== null && product.method !== null
        ? loanSchema.safeParse({
            principal: request.amount,
            annualRate,
            months: request.months,
            method: product.method,
            fee,
            firstDue: '2000-01-01', // Internal fixed anchor; dates are not offered terms.
          })
        : null;
    const validatedLoan = loan?.success ? loan.data : null;
    const estimate = validatedLoan ? simulate(validatedLoan) : null;
    const peakPayment = estimate
      ? Math.max(...estimate.schedule.map((period) => period.payment))
      : null;
    const stressedIncome = profile
      ? new Decimal(profile.income)
          .times(new Decimal(100).minus(incomeStressPercent))
          .div(100)
          .floor()
          .toNumber()
      : null;
    const baselineResidual =
      profile && peakPayment !== null
        ? new Decimal(profile.income)
            .minus(profile.expenses)
            .minus(profile.debt)
            .minus(peakPayment)
            .toNumber()
        : null;
    const stressedResidual =
      profile && stressedIncome !== null && peakPayment !== null
        ? new Decimal(stressedIncome)
            .minus(profile.expenses)
            .minus(profile.debt)
            .minus(peakPayment)
            .toNumber()
        : null;
    const repayment: LoanMatchEntry['repayment'] =
      estimate && peakPayment !== null
        ? {
            firstPayment: estimate.firstPayment,
            peakPayment,
            totalKnown: estimate.repayment,
            totalWithFees: estimate.total,
            annualRate: validatedLoan!.annualRate,
            method: validatedLoan!.method,
            monthlyBudget: monthly,
            baselineResidual,
            stressedIncome,
            stressedResidual,
            existingDebt: profile?.debt ?? null,
          }
        : null;
    const hardConstraints: LoanMatchEntry['hardConstraints'] = [];
    if (
      monthly !== null &&
      peakPayment !== null &&
      (peakPayment > monthly || (baselineResidual ?? 0) < 0)
    ) {
      hardConstraints.push('budget_exceeded');
      reasons.push('budget_exceeded');
    }
    if (
      profile &&
      request.reserveMonths &&
      request.savings !== undefined &&
      new Decimal(request.savings).lt(new Decimal(profile.expenses).times(request.reserveMonths))
    ) {
      hardConstraints.push('reserve_shortfall');
      reasons.push('reserve_shortfall');
    }
    if (stressedResidual !== null && stressedResidual < 0) reasons.push('stress_pressure');
    const alternatives: LoanMatchEntry['alternatives'] = [];
    if (
      hardConstraints.includes('budget_exceeded') &&
      monthly !== null &&
      monthly > 0 &&
      validatedLoan
    ) {
      const optionPeak = (amount: number, months: number) => {
        const plan = simulate({ ...validatedLoan, principal: amount, months });
        return Math.max(...plan.schedule.map((period) => period.payment));
      };
      if (product.amountMin !== null && product.amountMin < request.amount) {
        let low = product.amountMin;
        let high = request.amount - 1;
        let best: number | null = null;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          if (optionPeak(middle, request.months) <= monthly) {
            best = middle;
            low = middle + 1;
          } else high = middle - 1;
        }
        if (best !== null)
          alternatives.push({
            kind: 'lower_amount',
            amount: best,
            months: request.months,
            peakPayment: optionPeak(best, request.months),
          });
      }
      if (product.monthsMax !== null && request.months < product.monthsMax) {
        for (
          let months = request.months + 1;
          months <= Math.min(360, product.monthsMax);
          months++
        ) {
          const peak = optionPeak(request.amount, months);
          if (peak <= monthly) {
            alternatives.push({
              kind: 'longer_term',
              amount: request.amount,
              months,
              peakPayment: peak,
            });
            break;
          }
        }
      }
    }
    if (!reasons.length) reasons.push('matching_terms');
    const missingReserve = !!request.reserveMonths && request.savings === undefined;
    if (missingReserve) reasons.push('reserve_unknown');
    const complete =
      eligibility === 'meets_known_conditions' &&
      profile !== null &&
      repayment !== null &&
      repayment.totalWithFees !== null &&
      !missingReserve;
    const suitability: LoanMatchEntry['suitability'] =
      eligibility === 'does_not_meet_known_conditions' || hardConstraints.length
        ? 'unsuitable'
        : complete
          ? 'suitable'
          : 'insufficient_information';
    const componentScores: LoanMatchEntry['componentScores'] = {
      monthlyAffordability:
        monthly && peakPayment !== null ? rounded(bounded(100 * (1 - peakPayment / monthly))) : 0,
      totalCost: 0, // Relative cost is assigned after all known totals are collected.
      resilience:
        stressedIncome && stressedResidual !== null
          ? rounded(bounded((100 * stressedResidual) / stressedIncome))
          : 0,
      termSuitability:
        conditions[1].status === 'met' ? 100 : conditions[1].status === 'unknown' ? 25 : 0,
      transparency: rounded(
        bounded((100 * product.completeness.known) / product.completeness.total),
      ),
    };
    return {
      productId: product.id,
      institution: product.institution,
      name: product.name,
      nameEn: product.nameEn,
      category: product.category,
      classification: product.classification,
      sourceUrl: product.sources[0]?.url ?? null,
      verifiedAt: product.sources[0]?.verifiedAt ?? null,
      eligibility,
      suitability,
      conditions,
      hardConstraints,
      alternatives,
      score: 0,
      componentScores,
      reasons,
      repayment,
    } satisfies LoanMatchEntry;
  });
  const knownCosts = entries.flatMap((entry) =>
    entry.eligibility === 'does_not_meet_known_conditions' ||
    !entry.repayment ||
    entry.repayment.totalWithFees === null
      ? []
      : [entry.repayment.totalWithFees],
  );
  const lowestCost = knownCosts.length ? Math.min(...knownCosts) : null;
  const highestTransparency = Math.max(
    0,
    ...entries.map((entry) => entry.componentScores.transparency),
  );
  for (const entry of entries) {
    entry.componentScores.totalCost =
      lowestCost !== null && entry.repayment?.totalWithFees !== null && entry.repayment
        ? rounded(bounded((100 * lowestCost) / entry.repayment.totalWithFees))
        : 0;
    if (
      entry.repayment?.totalWithFees !== null &&
      entry.repayment &&
      lowestCost !== null &&
      entry.repayment.totalWithFees > lowestCost
    )
      entry.reasons.push('cost_higher');
    if (entry.componentScores.transparency < highestTransparency)
      entry.reasons.push('transparency_lower');
    entry.score = rounded(
      Object.entries(policy.weights).reduce(
        (sum, [key, weight]) =>
          sum + (entry.componentScores[key as keyof typeof entry.componentScores] * weight) / 100,
        0,
      ),
    );
  }
  entries.sort(
    (left, right) =>
      statusOrder[left.suitability] - statusOrder[right.suitability] ||
      right.score - left.score ||
      left.productId.localeCompare(right.productId, 'en'),
  );
  const suitableIds = entries
    .filter((entry) => entry.suitability === 'suitable')
    .map((entry) => entry.productId);
  return loanMatchResultSchema.parse({
    outcome: suitableIds.length ? 'suitable_found' : 'no_suitable_loan',
    request,
    profileAvailable: profile !== null,
    weights: policy.weights,
    affordabilityTarget: policy.affordabilityTarget,
    incomeStressPercent,
    suitableIds,
    ranked: entries,
  });
}
