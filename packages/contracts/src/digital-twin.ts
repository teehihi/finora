import { z } from 'zod';
import { loanSchema, money } from './core.js';

export const twinSourceSchema = z.enum(['observed', 'user_estimate', 'simulated_assumption']);
export const twinAmountSchema = z.strictObject({ amount: money, source: twinSourceSchema });
export const twinEventSchema = z.strictObject({
  kind: z.enum(['income', 'essentialExpense', 'discretionaryExpense', 'existingDebt']),
  change: z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000),
  startMonth: z.number().int().min(1).max(360),
  durationMonths: z.number().int().min(1).max(360),
  source: twinSourceSchema,
  label: z.string().trim().min(1).max(100),
});
export const twinStateSchema = z.strictObject({
  monthlyIncome: twinAmountSchema.nullable(),
  incomeStability: z.enum(['stable', 'variable', 'unknown']).nullable(),
  essentialExpenses: twinAmountSchema.nullable(),
  discretionaryExpenses: twinAmountSchema.nullable(),
  existingDebtPayments: twinAmountSchema.nullable(),
  currentSavings: twinAmountSchema.nullable(),
  emergencyFund: twinAmountSchema.nullable(),
  events: z.array(twinEventSchema).max(60),
});
const interval = z.strictObject({
  startMonth: z.number().int().min(1).max(360),
  durationMonths: z.number().int().min(1).max(360),
});
export const twinShockSchema = z.discriminatedUnion('kind', [
  interval.extend({ kind: z.literal('incomeReduction'), percent: z.number().min(0).max(100) }),
  interval.extend({ kind: z.literal('unemployment') }),
  interval.extend({ kind: z.literal('expenseInflation'), percent: z.number().min(0).max(100) }),
  interval.extend({ kind: z.literal('additionalDebt'), monthlyPayment: money }),
  z.strictObject({
    kind: z.literal('unexpectedExpense'),
    startMonth: z.number().int().min(1).max(360),
    amount: money,
  }),
  z.strictObject({
    kind: z.literal('earlyRepayment'),
    startMonth: z.number().int().min(1).max(360),
    amount: money.positive(),
    fee: money.nullable(),
  }),
]);
export const twinScenarioSchema = z.strictObject({
  shocks: z.array(twinShockSchema).max(12),
  alternativeLoan: loanSchema.pick({ principal: true, months: true }).partial().optional(),
});
export const twinThresholdsSchema = z.strictObject({
  stressedDebtToIncomePercent: z.number().min(1).max(100),
  requiredEmergencyMonths: z.number().min(0).max(24),
});
export const twinProjectionRequestSchema = z.strictObject({
  state: twinStateSchema,
  loan: loanSchema,
  scenario: twinScenarioSchema,
  thresholds: twinThresholdsSchema.optional(),
});
export const twinComparisonRequestSchema = z.strictObject({
  state: twinStateSchema,
  loan: loanSchema,
  scenarios: z.array(twinScenarioSchema).min(1).max(3),
  thresholds: twinThresholdsSchema.optional(),
});
const nullableSigned = z.number().int().safe().nullable();
const nullableNonnegative = z.number().int().safe().nonnegative().nullable();
export const twinMonthSchema = z.strictObject({
  period: z.number().int().min(1).max(360),
  date: z.iso.date(),
  income: money,
  essentialExpenses: money,
  discretionaryExpenses: money,
  existingDebtPayments: money,
  loanPayment: z.number().int().safe().nonnegative(),
  netCashFlow: nullableSigned,
  accumulatedSavings: nullableSigned,
  loanBalance: money,
  debtToIncomePercent: z.number().min(0).nullable(),
  emergencyCoverageMonths: z.number().min(0).nullable(),
  cashShortfall: z.boolean(),
  stressed: z.boolean(),
});
export const twinProjectionSchema = z.strictObject({
  status: z.enum(['projected', 'incomplete']),
  provenance: z.strictObject({
    monthlyIncome: twinSourceSchema.nullable(),
    essentialExpenses: twinSourceSchema.nullable(),
    discretionaryExpenses: twinSourceSchema.nullable(),
    existingDebtPayments: twinSourceSchema.nullable(),
    currentSavings: twinSourceSchema.nullable(),
    emergencyFund: twinSourceSchema.nullable(),
    events: z.array(twinSourceSchema).max(60),
  }),
  months: z.array(twinMonthSchema).max(360),
  missing: z.array(z.string()).max(7),
  firstCashShortfall: z.number().int().min(1).max(360).nullable(),
  stressedPeriods: z.number().int().min(0).max(360),
  reserveDepletionMonth: z.number().int().min(1).max(360).nullable(),
  recoveryMonth: z.number().int().min(1).max(360).nullable(),
  resilience: z.enum(['insufficient_data', 'resilient', 'pressured', 'unsustainable']),
  resilienceReasons: z.array(z.string()).max(8),
  unknownCosts: z.array(z.string()).max(5),
  hypotheticalEarlyRepayment: z.boolean(),
  assumptions: z.array(z.string()).max(10),
  thresholds: twinThresholdsSchema,
  totalKnownLoanPayments: nullableNonnegative,
});
export const twinComparisonSchema = z.strictObject({
  baseline: twinProjectionSchema,
  alternatives: z.array(twinProjectionSchema).min(1).max(3),
});
export type TwinState = z.infer<typeof twinStateSchema>;
export type TwinScenario = z.infer<typeof twinScenarioSchema>;
export type TwinProjectionRequest = z.infer<typeof twinProjectionRequestSchema>;
export type TwinProjection = z.infer<typeof twinProjectionSchema>;
export type TwinComparisonRequest = z.infer<typeof twinComparisonRequestSchema>;
export type TwinComparison = z.infer<typeof twinComparisonSchema>;
