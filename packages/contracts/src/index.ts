import { z } from 'zod';
import type { SavedStressAnalysis } from './intelligence';
import { localeSchema, loanSchema } from './core.js';
import type { Locale, Method, Profile, Preferences, LoanInput } from './core.js';

export * from './core.js';
export const draftSchema = z
  .object({ productId: z.string().max(80).min(1), input: loanSchema })
  .strict();
export const saveSchema = draftSchema.extend({ requestId: z.uuid() });
export const saveCustomSimulationSchema = saveSchema
  .omit({ productId: true })
  .extend({ confirmed: z.literal(true) });
export type SaveCustomSimulation = z.infer<typeof saveCustomSimulationSchema>;
export const userScenarioSource = 'FINORA_USER_SCENARIO';
export const chatSchema = z
  .object({
    prompt: z.string().trim().min(1).max(1200),
    simulationId: z.uuid().optional(),
    locale: localeSchema,
    requestId: z.uuid(),
  })
  .strict();
export type ChatRequest = z.infer<typeof chatSchema>;
export interface Payment {
  period: number;
  date: string;
  principal: number;
  interest: number;
  payment: number;
  balance: number;
}
export interface Estimate {
  schedule: Payment[];
  firstPayment: number;
  interest: number;
  repayment: number;
  total: number | null;
  stressAnalysis?: SavedStressAnalysis;
}
export interface Product {
  id: string;
  name: string;
  nameEn: string;
  institution: string;
  category: 'personal' | 'education' | 'home';
  rateMin: number;
  rateMax: number;
  amountMin: number;
  amountMax: number;
  monthsMin: number;
  monthsMax: number;
  method: Method;
  fee: number | null;
  source: string;
}
export interface Saved {
  id: string;
  product: Product;
  input: LoanInput;
  result: Estimate;
  createdAt: string;
}
export interface ChatTurn {
  id: string;
  prompt: string;
  answer: string;
  simulationId: string | null;
  locale: Locale;
  createdAt: string;
  provider: 'mock';
  facts: { firstPayment: number; repayment: number; total: number | null } | null;
}
export interface AccountData {
  profile: Profile | null;
  preferences: Preferences;
}
export const zone = 'Asia/Ho_Chi_Minh';

export * from './catalog-intelligence.js';
export * from './loan-matching.js';
export * from './digital-twin.js';
export * from './repayments.js';

export * from './intelligence';

export const documentMimeSchema = z.enum(['application/pdf', 'image/jpeg', 'image/png']);
export type DocumentMime = z.infer<typeof documentMimeSchema>;
export const maxDocumentBytes = 5 * 1024 * 1024;
export const documentFieldNames = [
  'lender',
  'principal',
  'disbursementAmount',
  'months',
  'annualRate',
  'effectiveApr',
  'interestRateType',
  'method',
  'paymentFrequency',
  'firstDue',
  'monthlyRepayment',
  'totalRepayment',
  'totalFees',
  'serviceFee',
  'insuranceFee',
  'latePenalty',
  'earlyRepayment',
  'earlyRepaymentFee',
  'otherObligations',
  'importantClauses',
] as const;
export type DocumentFieldName = (typeof documentFieldNames)[number];
export type DocumentExtractionMode = 'pdf-text' | 'pdf-ocr' | 'local-ocr' | 'manual';
export type DocumentEvidenceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};
export type DocumentEvidence = {
  page: number;
  excerpt: string;
  bbox?: DocumentEvidenceBox;
};
export type DocumentField = {
  state: 'found' | 'missing' | 'conflicting' | 'unsupported';
  value: string | number | null;
  sources: DocumentEvidence[];
  rawValue?: string | null;
  unit?: 'VND' | 'months' | 'percent_per_year' | 'percent' | 'date' | 'frequency' | 'text' | null;
  confidence?: 'high' | 'review' | 'none';
  extraction?: 'direct_text' | 'ocr' | 'none';
  confirmationRequired?: boolean;
};
export type DocumentRiskKind =
  | 'mandatory_fee'
  | 'insurance_deduction'
  | 'nominal_effective_gap'
  | 'ambiguous_interest'
  | 'early_repayment_penalty'
  | 'late_payment_obligation'
  | 'missing_term'
  | 'conflicting_term'
  | 'non_monthly_frequency';
export type DocumentRisk = {
  kind: DocumentRiskKind;
  field: DocumentFieldName;
  severity: 'review' | 'attention';
  evidence: DocumentEvidence[];
};
export interface DocumentSummary {
  id: string;
  mime: DocumentMime;
  size: number;
  createdAt: string;
  synthetic: boolean;
  mode: DocumentExtractionMode;
}
export interface DocumentReview extends DocumentSummary {
  fields: Record<DocumentFieldName, DocumentField>;
  confirmedTerms?: Partial<Record<DocumentFieldName, DocumentConfirmedTerm>>;
  risks?: DocumentRisk[];
  pagesAnalyzed?: number;
  truncated?: boolean;
  reason?: 'text-unavailable' | 'ocr-unavailable' | 'reader-unavailable' | 'processing-timeout';
}
export type DocumentConfirmedTerm = {
  value: string | number;
  rawValue: string;
  unit: NonNullable<DocumentField['unit']>;
};
export const documentTermCorrectionSchema = z
  .object({ rawValue: z.string().trim().min(1).max(220) })
  .strict();
export const reviewedDocumentSource = 'finora:confirmed-private-document';
export const documentReviewSchema = z
  .object({
    input: loanSchema,
    lender: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[^\p{Cc}\p{Cf}]+$/u)
      .optional(),
    confirmed: z.literal(true),
  })
  .strict();
export const documentSaveSchema = documentReviewSchema.extend({ requestId: z.uuid() });
export type DocumentReviewInput = z.infer<typeof documentReviewSchema>;
