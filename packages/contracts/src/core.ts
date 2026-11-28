import { z } from 'zod';

export const localeSchema = z.enum(['vi-VN', 'en-US']);
export type Locale = z.infer<typeof localeSchema>;
export const methodSchema = z.enum(['flat', 'equalPrincipal', 'annuity']);
export type Method = z.infer<typeof methodSchema>;
export const money = z.number().int().min(0).max(1_000_000_000_000);
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
export const profileSchema = z
  .object({ income: money.positive(), debt: money, expenses: money })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[^\p{Cc}]+$/u);
export const preferencesSchema = z
  .object({ locale: localeSchema, appearance: z.enum(['light', 'dark', 'system']) })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
