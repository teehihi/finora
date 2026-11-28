import { z } from 'zod';
import { loanMatchResultSchema } from './loan-matching.js';
import { twinScenarioSchema, twinStateSchema } from './digital-twin.js';

const outputMoney = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const signedMoney = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const id = z.string().min(1).max(100);
const method = z.enum(['flat', 'equalPrincipal', 'annuity']);
const text = z.string().min(1).max(600);
const url = z.url({ protocol: /^https$/ });
const stressBasis = z
  .object({
    incomeReductionPercent: z.number().min(0).max(100).nullable(),
    expenseIncreasePercent: z.number().min(0).max(1000).nullable(),
    monthlyIncomeLoss: outputMoney,
    monthlyExpenseIncrease: outputMoney,
  })
  .strict();

// Optional metadata in an owner-confirmed schedule snapshot, not a profile update.
export const savedStressAnalysisSchema = stressBasis
  .extend({
    remainingCash: signedMoney,
    stressRemainingCash: signedMoney,
  })
  .strict();
export type SavedStressAnalysis = z.infer<typeof savedStressAnalysisSchema>;

export const intelligenceRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(1200),
    locale: z.enum(['vi-VN', 'en-US']),
    requestId: z.uuid(),
    simulationId: z.uuid().optional(),
    documentId: z.uuid().optional(),
    externalConsent: z.boolean().optional(),
  })
  .strict();

export const intelligenceScenarioSchema = z
  .object({
    kind: z.literal('scenario'),
    principal: outputMoney.positive(),
    months: z.number().int().min(1).max(360),
    firstDue: z.iso.date(),
    annualRate: z.number().min(0).max(100),
    method,
    fee: outputMoney.nullable(),
    firstPayment: outputMoney,
    peakPayment: outputMoney,
    repayment: outputMoney,
    total: outputMoney.nullable(),
    remainingCash: signedMoney.nullable(),
    stressRemainingCash: signedMoney.nullable(),
    // Optional for portable history created before decision guidance.
    planningCapacity: outputMoney.optional(),
    stressBasis: stressBasis.optional(),
    source: z.enum(['user_assumptions', 'saved_simulation']),
    simulationId: z.uuid().optional(),
  })
  .strict();

export const intelligenceBlockSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('affordability'),
      income: outputMoney,
      expenses: outputMoney,
      debt: outputMoney,
      cashFlow: signedMoney,
      monthlyCapacity: outputMoney,
      emergencyMonths: z.number().nonnegative().nullable().optional(),
      debtRatio: z.number().nonnegative().nullable(),
      basis: z.enum(['profile', 'user']),
    })
    .strict(),
  z
    .object({
      kind: z.literal('offers'),
      items: z
        .array(
          z
            .object({
              id,
              institution: text,
              name: text,
              amountMin: outputMoney.nullable(),
              amountMax: outputMoney.nullable(),
              monthsMin: z.number().int().nonnegative().nullable(),
              monthsMax: z.number().int().nonnegative().nullable(),
              rateLabel: text.nullable(),
              sourceUrl: url.nullable(),
            })
            .strict(),
        )
        .max(5),
    })
    .strict(),
  intelligenceScenarioSchema,
  z.object({ kind: z.literal('matches'), result: loanMatchResultSchema }).strict(),
  z.strictObject({
    kind: z.literal('repayment_monitor'),
    next: z
      .strictObject({
        loanId: z.uuid(),
        title: z.string().min(1).max(80),
        payment: outputMoney,
        date: z.iso.date(),
        period: z.number().int().min(1).max(360),
      })
      .nullable(),
    overdueCount: z.number().int().min(0).max(360),
    additionalNeeded: outputMoney.nullable(),
    shortfallDate: z.iso.date().nullable(),
    planAsOf: z.iso.date().nullable(),
    alerts: z.array(z.enum(['overdue', 'multiple_due_close', 'projected_shortfall'])).max(3),
    missing: z.array(z.string().min(1).max(40)).max(6),
  }),
  z.strictObject({
    kind: z.literal('digital_twin'),
    state: twinStateSchema,
    scenario: twinScenarioSchema,
    simulationId: z.uuid().nullable(),
    baseline: z.strictObject({
      months: z.number().int().min(0).max(360),
      resilience: z.enum(['insufficient_data', 'resilient', 'pressured', 'unsustainable']),
      firstCashShortfall: z.number().int().min(1).max(360).nullable(),
      stressedPeriods: z.number().int().min(0).max(360),
      minimumCashFlow: signedMoney.nullable(),
      finalSavings: signedMoney.nullable(),
    }),
    stressed: z.strictObject({
      months: z.number().int().min(0).max(360),
      resilience: z.enum(['insufficient_data', 'resilient', 'pressured', 'unsustainable']),
      firstCashShortfall: z.number().int().min(1).max(360).nullable(),
      stressedPeriods: z.number().int().min(0).max(360),
      minimumCashFlow: signedMoney.nullable(),
      finalSavings: signedMoney.nullable(),
      reserveDepletionMonth: z.number().int().min(1).max(360).nullable(),
      unknownCosts: z.array(z.string()).max(5),
      hypotheticalEarlyRepayment: z.boolean(),
      missing: z.array(z.string()).max(7),
    }),
  }),
  z
    .object({
      kind: z.literal('profile_update'),
      income: z.number().int().positive().max(1_000_000_000_000),
      expenses: z.number().int().nonnegative().max(1_000_000_000_000),
      debt: z.number().int().nonnegative().max(1_000_000_000_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal('document_review'),
      documentId: z.uuid(),
      mode: z.enum(['pdf-text', 'pdf-ocr', 'local-ocr', 'manual']),
      foundCount: z.number().int().min(0).max(25),
      unresolvedCount: z.number().int().min(0).max(25),
      riskKinds: z
        .array(
          z.enum([
            'mandatory_fee',
            'insurance_deduction',
            'nominal_effective_gap',
            'ambiguous_interest',
            'early_repayment_penalty',
            'late_payment_obligation',
            'missing_term',
            'conflicting_term',
            'non_monthly_frequency',
          ]),
        )
        .max(25)
        .optional(),
    })
    .strict(),
  z.object({ kind: z.literal('missing'), fields: z.array(id).max(9), message: text }).strict(),
  z.object({ kind: z.literal('notice'), message: text }).strict(),
]);

export const intelligenceBlocksSchema = z.array(intelligenceBlockSchema).max(12);
export const intelligenceTurnSchema = z
  .object({
    id: z.uuid(),
    prompt: z.string().max(1200),
    answer: z.string().max(7000),
    provider: z.enum(['mock', 'fallback', 'openai', 'anthropic']),
    createdAt: z.iso.datetime({ offset: true }),
    blocks: intelligenceBlocksSchema,
    simulationId: z.uuid().nullable(),
  })
  .strict();
export const intelligenceHistorySchema = z.array(intelligenceTurnSchema).max(50);
export const intelligenceEventSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('meta'),
      provider: z.enum(['mock', 'fallback', 'openai', 'anthropic']),
    })
    .strict(),
  z
    .object({
      type: z.literal('progress'),
      stage: z.enum(['provider', 'profile', 'catalog', 'calculation']),
    })
    .strict(),
  z.object({ type: z.literal('delta'), text: z.string().max(7000) }).strict(),
  z.object({ type: z.literal('structured'), blocks: intelligenceBlocksSchema }).strict(),
  z.object({ type: z.literal('done'), turnId: z.uuid().optional() }).strict(),
  z.object({ type: z.literal('error') }).strict(),
]);

export const saveIntelligenceScenarioSchema = z
  .object({
    turnId: z.uuid(),
    blockIndex: z.number().int().min(0).max(11),
    requestId: z.uuid(),
    confirmed: z.literal(true),
  })
  .strict();

export type IntelligenceRequest = z.infer<typeof intelligenceRequestSchema>;
export type IntelligenceBlock = z.infer<typeof intelligenceBlockSchema>;
export type IntelligenceScenario = z.infer<typeof intelligenceScenarioSchema>;
export type IntelligenceTurn = z.infer<typeof intelligenceTurnSchema>;
export type IntelligenceEvent = z.infer<typeof intelligenceEventSchema>;
