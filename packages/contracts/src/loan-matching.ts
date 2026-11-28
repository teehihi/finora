import { z } from 'zod';
import { money, profileSchema } from './core.js';
import { publicLoanCategorySchema, publicLoanIdSchema } from './catalog-intelligence.js';

export const matchWeightsSchema = z
  .strictObject({
    monthlyAffordability: z.number().int().min(0).max(100),
    totalCost: z.number().int().min(0).max(100),
    resilience: z.number().int().min(0).max(100),
    termSuitability: z.number().int().min(0).max(100),
    transparency: z.number().int().min(0).max(100),
  })
  .refine(
    (weights) => Object.values(weights).reduce((sum, value) => sum + value, 0) === 100,
    'Weights must sum to 100',
  );

export const matchPolicySchema = z.strictObject({
  weights: matchWeightsSchema,
  affordabilityTarget: z.number().min(0.05).max(0.8),
  incomeStressPercent: z.number().int().min(0).max(80),
});
export type MatchPolicy = z.infer<typeof matchPolicySchema>;

export const loanMatchRequestSchema = z.strictObject({
  amount: money.positive(),
  months: z.number().int().min(1).max(360),
  category: publicLoanCategorySchema.optional(),
  savings: money.optional(),
  reserveMonths: z.number().int().min(0).max(24).optional(),
  incomeStressPercent: z.number().int().min(0).max(80).optional(),
});
export type LoanMatchRequest = z.infer<typeof loanMatchRequestSchema>;
export const loanMatchInputSchema = z.strictObject({
  request: loanMatchRequestSchema,
  profile: profileSchema.nullable(),
});
export type LoanMatchInput = z.infer<typeof loanMatchInputSchema>;

export const matchReasonSchema = z.enum([
  'amount_outside',
  'term_outside',
  'purpose_outside',
  'purpose_unknown',
  'amount_unknown',
  'term_unknown',
  'eligibility_unverified',
  'rate_unknown',
  'method_unknown',
  'fees_unknown',
  'insurance_unknown',
  'profile_missing',
  'reserve_unknown',
  'budget_exceeded',
  'reserve_shortfall',
  'stress_pressure',
  'cost_higher',
  'transparency_lower',
  'matching_terms',
]);
export type MatchReason = z.infer<typeof matchReasonSchema>;
const score = z.number().min(0).max(100);
const calculatedMoney = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const loanMatchEntrySchema = z.strictObject({
  productId: publicLoanIdSchema,
  institution: z.string(),
  name: z.string(),
  nameEn: z.string(),
  category: publicLoanCategorySchema,
  classification: z.enum(['real', 'simulated', 'incomplete']),
  sourceUrl: z.url({ protocol: /^https$/ }).nullable(),
  verifiedAt: z.iso.date().nullable(),
  eligibility: z.enum([
    'meets_known_conditions',
    'does_not_meet_known_conditions',
    'insufficient_information',
  ]),
  suitability: z.enum(['suitable', 'unsuitable', 'insufficient_information']),
  conditions: z
    .array(
      z.strictObject({
        key: z.enum(['amount', 'term', 'purpose', 'published_eligibility']),
        status: z.enum(['met', 'not_met', 'unknown']),
      }),
    )
    .max(4),
  hardConstraints: z.array(z.enum(['budget_exceeded', 'reserve_shortfall'])).max(2),
  alternatives: z
    .array(
      z.strictObject({
        kind: z.enum(['lower_amount', 'longer_term']),
        amount: money.positive(),
        months: z.number().int().min(1).max(360),
        peakPayment: calculatedMoney,
      }),
    )
    .max(2),
  score,
  componentScores: z.strictObject({
    monthlyAffordability: score,
    totalCost: score,
    resilience: score,
    termSuitability: score,
    transparency: score,
  }),
  reasons: z.array(matchReasonSchema).max(16),
  repayment: z
    .strictObject({
      firstPayment: calculatedMoney,
      peakPayment: calculatedMoney,
      totalKnown: calculatedMoney,
      totalWithFees: calculatedMoney.nullable(),
      annualRate: z.number().min(0).max(100),
      method: z.enum(['flat', 'equalPrincipal', 'annuity']),
      monthlyBudget: money.nullable(),
      baselineResidual: z.number().int().nullable(),
      stressedIncome: money.nullable(),
      stressedResidual: z.number().int().nullable(),
      existingDebt: money.nullable(),
    })
    .nullable(),
});
export type LoanMatchEntry = z.infer<typeof loanMatchEntrySchema>;
export const loanMatchResultSchema = z.strictObject({
  outcome: z.enum(['suitable_found', 'no_suitable_loan']),
  request: loanMatchRequestSchema,
  profileAvailable: z.boolean(),
  weights: matchWeightsSchema,
  affordabilityTarget: z.number().min(0.05).max(0.8),
  incomeStressPercent: z.number().int().min(0).max(80),
  suitableIds: z.array(publicLoanIdSchema).max(24),
  ranked: z.array(loanMatchEntrySchema).max(24),
});
export type LoanMatchResult = z.infer<typeof loanMatchResultSchema>;
