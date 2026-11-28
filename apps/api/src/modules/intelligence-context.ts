import { z } from 'zod';
import {
  intelligenceBlocksSchema,
  intelligenceScenarioSchema,
  loanSchema,
  profileSchema,
  type IntelligenceBlock,
  type LoanInput,
} from '@finora/contracts';
import { interpret, normalizeVn, snapshotOf, type Intent } from './intelligence-rules.js';

const amount = z.number().int().nonnegative().max(1_000_000_000_000);
const term = z.number().int().min(1).max(360);
const amountStatus = z
  .object({
    income: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    expenses: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    debt: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    principal: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    savings: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    currentSavings: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    minimumReserve: z.enum(['approximate', 'stated', 'confirmed']).optional(),
    preferredPayment: z.enum(['approximate', 'stated', 'confirmed']).optional(),
  })
  .strict();
const contextSchema = z
  .object({
    income: profileSchema.shape.income.optional(),
    incomeStability: z.enum(['stable', 'variable']).optional(),
    expenses: profileSchema.shape.expenses.optional(),
    essentialExpenses: amount.optional(),
    debt: profileSchema.shape.debt.optional(),
    savings: amount.optional(),
    currentSavings: amount.optional(),
    minimumReserve: amount.optional(),
    amountStatus: amountStatus.optional(),
    reserveMonths: z.number().int().min(0).max(60).optional(),
    preferredPayment: amount.optional(),
    principal: loanSchema.shape.principal.optional(),
    annualRate: loanSchema.shape.annualRate.optional(),
    monthlyQuoted: z.boolean().optional(),
    months: term.optional(),
    secondMonths: term.optional(),
    method: loanSchema.shape.method.optional(),
    fee: loanSchema.shape.fee.optional(),
    incomeCut: z.number().min(0).max(100).optional(),
    extraExpense: amount.optional(),
    expenseRisePercent: z.number().min(0).max(1000).optional(),
    purpose: z.enum(['personal', 'education', 'home', 'vehicle', 'business']).optional(),
    firstDue: loanSchema.shape.firstDue.optional(),
  })
  .strict();
type Context = z.infer<typeof contextSchema>;
const analysisRecord = z.object({ version: z.literal(2), blocks: intelligenceBlocksSchema });
const envelope = analysisRecord.extend({ context: contextSchema.optional() });

type PreviousTurn = { blocks: unknown; prompt: string; simulationId: string | null };

export function analysisBlocks(value: unknown): IntelligenceBlock[] {
  const parsed = analysisRecord.safeParse(value);
  if (parsed.success) return parsed.data.blocks;
  return intelligenceBlocksSchema.parse(value);
}

export function persistedAnalysis(blocks: IntelligenceBlock[], context?: Context) {
  return envelope.parse({ version: 2, blocks, ...(context ? { context } : {}) });
}

function contextOf(turn: PreviousTurn): Context | undefined {
  const stored = envelope.safeParse(turn.blocks);
  if (stored.success) return stored.data.context;
  // Older turns stored a plain array. Preserve their existing facts,
  // but never infer inputs from an unrelated tip or a safety response.
  const parsed = intelligenceBlocksSchema.safeParse(turn.blocks);
  if (!parsed.success) return undefined;
  const prior = interpret(turn.prompt);
  if (prior.blocked) return undefined;
  const scenarios = parsed.data.filter((b) => b.kind === 'scenario');
  const first = intelligenceScenarioSchema.safeParse(scenarios[0]);
  const affine = parsed.data.find((b) => b.kind === 'affordability' && b.basis === 'user');
  const hasPending = parsed.data.some((b) => b.kind === 'missing');
  if (!first.success && !hasPending && !affine) return undefined;
  return captureContext(
    { ...prior, ...(scenarios[1] ? { secondMonths: scenarios[1].months } : {}) },
    first.success ? snapshotOf(first.data, first.data.firstDue) : undefined,
  );
}

// Only store user-supplied or attached assumptions. Do not freeze values read from
// the financial profile; missing values may still reflect current profile edits.
export function captureContext(intent: Intent, loan?: LoanInput): Context | undefined {
  const keys = Object.keys(contextSchema.shape) as (keyof Context)[];
  const entries = Object.fromEntries(
    keys.map((key) => [
      key,
      key === 'monthlyQuoted' && intent.annualRate === undefined
        ? undefined
        : intent[key as keyof Intent],
    ]),
  );
  const parsed = contextSchema.safeParse({ ...entries, ...loan });
  if (!parsed.success) {
    // Loan/profile schemas are intentionally stricter than natural-language
    // extraction. Preserve other valid assumptions if one field is out of range.
    const validEntries = Object.fromEntries(
      keys.flatMap((key) => {
        const field = contextSchema.shape[key].safeParse(entries[key]);
        return field.success && field.data !== undefined ? [[key, field.data]] : [];
      }),
    );
    const valid = contextSchema.parse({ ...validEntries, ...loan });
    return Object.values(valid).some((value) => value !== undefined) ? valid : undefined;
  }
  return Object.values(parsed.data).some((v) => v !== undefined) ? parsed.data : undefined;
}

export function continueIntent(
  current: Intent,
  prompt: string,
  history: PreviousTurn[],
  attached?: LoanInput,
  simulationId?: string,
) {
  const previous = history
    .filter((turn) => (turn.simulationId ?? undefined) === simulationId)
    .map(contextOf)
    .find(Boolean);
  const normalized = normalizeVn(prompt);
  const asksComparison =
    /\b(?:khoan nao|phuong an nao|ky han nao|which term|which option)\b/.test(normalized) &&
    /\b(?:chi phi|tien lai|tong tien|tra it|cost|interest|cheaper)\b/.test(normalized);
  const explicitFollow =
    asksComparison ||
    /\b(neu|thi sao|what if|instead|giam them|tang them|follow[- ]?up|tong hop ho so|kha nang chi tra)\b/.test(
      normalized,
    ) ||
    current.incomeCut !== undefined ||
    current.extraExpense !== undefined ||
    current.expenseRisePercent !== undefined ||
    current.knownPayment !== undefined ||
    current.resetStress ||
    current.principalDelta !== undefined ||
    current.early;
  const definitionQuestion = /\b(?:la gi|nghia la gi|giai thich|how does|what is|what does)\b/.test(
    normalized,
  );
  const changesTerms =
    current.months !== undefined ||
    current.annualRate !== undefined ||
    current.method !== undefined ||
    current.fee !== undefined;
  const completesBudget = [
    current.income,
    current.expenses,
    current.essentialExpenses,
    current.debt,
    current.savings,
    current.currentSavings,
    current.minimumReserve,
    current.reserveMonths,
    current.preferredPayment,
    current.incomeStability,
  ].some((value) => value !== undefined);
  const continues = Boolean(
    previous &&
    (explicitFollow ||
      (current.principal === undefined &&
        current.purpose === undefined &&
        ((changesTerms && !definitionQuestion) || completesBudget)) ||
      (current.principal !== undefined &&
        previous.principal === undefined &&
        (!current.purpose || current.purpose === previous.purpose) &&
        (previous.months !== undefined || previous.annualRate !== undefined))),
  );
  const prior = continues ? previous : undefined;
  const priorStress = current.resetStress ? undefined : prior;
  const updatesExpenseStress =
    current.extraExpense !== undefined || current.expenseRisePercent !== undefined;
  const mergedStatus = { ...prior?.amountStatus, ...current.amountStatus };
  const intent: Intent = {
    ...current,
    income: current.income ?? prior?.income,
    incomeStability: current.incomeStability ?? prior?.incomeStability,
    expenses: current.expenses ?? prior?.expenses,
    essentialExpenses: current.essentialExpenses ?? prior?.essentialExpenses,
    debt: current.debt ?? prior?.debt,
    savings: current.savings ?? prior?.savings,
    currentSavings: current.currentSavings ?? prior?.currentSavings,
    minimumReserve: current.minimumReserve ?? prior?.minimumReserve,
    amountStatus: Object.keys(mergedStatus).length ? mergedStatus : undefined,
    reserveMonths: current.reserveMonths ?? prior?.reserveMonths,
    preferredPayment: current.preferredPayment ?? prior?.preferredPayment,
    incomeCut: current.incomeCut ?? priorStress?.incomeCut,
    extraExpense: updatesExpenseStress ? current.extraExpense : priorStress?.extraExpense,
    expenseRisePercent: updatesExpenseStress
      ? current.expenseRisePercent
      : priorStress?.expenseRisePercent,
    principal: current.principal ?? prior?.principal ?? attached?.principal,
    annualRate: current.annualRate ?? prior?.annualRate ?? attached?.annualRate,
    monthlyQuoted:
      current.annualRate !== undefined ? current.monthlyQuoted : (prior?.monthlyQuoted ?? false),
    months: current.months ?? prior?.months ?? attached?.months,
    secondMonths:
      current.secondMonths ?? (current.months === undefined ? prior?.secondMonths : undefined),
    method: current.method ?? prior?.method ?? attached?.method,
    fee:
      current.fee !== undefined
        ? current.fee
        : prior?.fee !== undefined
          ? prior.fee
          : attached?.fee,
    purpose: current.purpose ?? prior?.purpose,
  };
  if (current.principalDelta !== undefined) {
    const before = prior?.principal ?? attached?.principal;
    intent.principal = before === undefined ? undefined : before + current.principalDelta;
  }
  return {
    intent,
    continues,
    firstDue: prior?.firstDue ?? attached?.firstDue,
    // Distinguish a revision of an existing estimate from a new unknown request.
    scoped: Boolean(attached || prior),
  };
}
