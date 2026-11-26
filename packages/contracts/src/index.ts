import { z } from 'zod';

export const localeSchema = z.enum(['vi-VN', 'en-US']);
export type Locale = z.infer<typeof localeSchema>;
export const methodSchema = z.enum(['flat', 'equalPrincipal', 'annuity']);
export type Method = z.infer<typeof methodSchema>;
export const money = z.number().int().min(0).max(1_000_000_000_000);
export const profileSchema = z
  .object({ income: money.positive(), debt: money, expenses: money })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export const preferencesSchema = z
  .object({ locale: localeSchema, appearance: z.enum(['light', 'dark', 'system']) })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export const loanSchema = z
  .object({
    principal: money.positive(),
    annualRate: z
      .number()
      .min(0)
      .max(100)
      .refine((rate) => Number(rate.toFixed(4)) === rate, 'Use at most four decimal places'),
    months: z.number().int().min(1).max(360),
    method: methodSchema,
    fee: money.nullable(),
    firstDue: z.iso.date().refine((v) => v >= '2000-01-01' && v < '2100-01-01'),
  })
  .strict();
export type LoanInput = z.infer<typeof loanSchema>;
export const draftSchema = z
  .object({ productId: z.string().max(80).min(1), input: loanSchema })
  .strict();
export const saveSchema = draftSchema.extend({ requestId: z.uuid() });
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
export * from './repayments.js';

export * from './intelligence';

export const documentMimeSchema = z.enum(['application/pdf', 'image/jpeg', 'image/png']);
export type DocumentMime = z.infer<typeof documentMimeSchema>;
export const maxDocumentBytes = 5 * 1024 * 1024;
export const documentFieldNames = [
  'lender',
  'principal',
  'months',
  'annualRate',
  'method',
  'firstDue',
  'monthlyRepayment',
  'totalRepayment',
  'totalFees',
  'serviceFee',
  'insuranceFee',
  'latePenalty',
  'earlyRepayment',
  'importantClauses',
] as const;
export type DocumentFieldName = (typeof documentFieldNames)[number];
export type DocumentExtractionMode = 'pdf-text' | 'local-ocr' | 'manual';
export type DocumentField = {
  state: 'found' | 'missing' | 'conflicting' | 'unsupported';
  value: string | number | null;
  sources: { page: number; excerpt: string }[];
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
  reason?: 'text-unavailable' | 'ocr-unavailable' | 'reader-unavailable';
}
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
