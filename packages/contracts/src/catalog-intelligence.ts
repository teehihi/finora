import { z } from 'zod';

const label = z.string().trim().min(1).max(220);
const detail = z.string().trim().min(1).max(650);
const amount = z.number().int().positive().max(1_000_000_000_000);
const duration = z.number().int().positive().max(720);
const rateValue = z.number().min(0).max(100);
const rate = z
  .strictObject({
    advertised: rateValue.nullable(),
    min: rateValue.nullable(),
    max: rateValue.nullable(),
    period: z.enum(['month', 'year']),
    basis: z.enum(['flat', 'declining', 'unknown']),
  })
  .refine((r) => r.advertised !== null || r.min !== null || r.max !== null, 'Rate needs a value')
  .refine((r) => r.min === null || r.max === null || r.min <= r.max, 'Inverted rate range');

export const publicLoanCategorySchema = z.enum(['personal', 'education', 'home', 'auto']);
export const publicLoanIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

export const publicLoanSourceSchema = z.strictObject({
  title: label,
  url: z.url({ protocol: /^https$/ }),
  kind: z.enum(['product-page', 'tariff', 'terms']),
  collectedAt: z.iso.date(),
  verifiedAt: z.iso.date(),
});

const record = z.strictObject({
  id: publicLoanIdSchema,
  institution: label,
  name: label,
  nameEn: label,
  category: publicLoanCategorySchema,
  purposes: z.array(detail).min(1).max(8),
  purposesEn: z.array(detail).min(1).max(8),
  amountMin: amount.nullable(),
  amountMax: amount.nullable(),
  monthsMin: duration.nullable(),
  monthsMax: duration.nullable(),
  rate: rate.nullable(),
  method: z.enum(['flat', 'equalPrincipal', 'annuity']).nullable(),
  fee: z.number().int().min(0).max(1_000_000_000_000).nullable(),
  feeDetails: detail.nullable(),
  feeDetailsEn: detail.nullable(),
  insurance: detail.nullable(),
  insuranceEn: detail.nullable(),
  earlyRepayment: detail.nullable(),
  earlyRepaymentEn: detail.nullable(),
  eligibility: z.array(detail).max(8),
  eligibilityEn: z.array(detail).max(8),
  notes: detail.nullable(),
  notesEn: detail.nullable(),
  maxLoanToValuePercent: z.number().positive().max(100).nullable(),
  provenance: z.literal('official_public'),
  verification: z.literal('reviewed_public'),
  sources: z.array(publicLoanSourceSchema).min(1).max(6),
});

function consistent(product: z.infer<typeof record>, ctx: z.RefinementCtx) {
  if (
    product.amountMin !== null &&
    product.amountMax !== null &&
    product.amountMin > product.amountMax
  ) {
    ctx.addIssue({ code: 'custom', path: ['amountMin'], message: 'Inverted amount range' });
  }
  if (
    product.monthsMin !== null &&
    product.monthsMax !== null &&
    product.monthsMin > product.monthsMax
  ) {
    ctx.addIssue({ code: 'custom', path: ['monthsMin'], message: 'Inverted term range' });
  }
  for (const [index, source] of product.sources.entries()) {
    if (source.verifiedAt < source.collectedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['sources', index, 'verifiedAt'],
        message: 'Review predates collection',
      });
    }
  }
}

export const publicLoanRecordSchema = record.superRefine(consistent);
export const publicLoanProductSchema = record
  .extend({
    completeness: z.strictObject({
      known: z.number().int().min(0).max(10),
      total: z.literal(10),
    }),
  })
  .superRefine(consistent);

export const publicLoanSearchSchema = z.strictObject({
  query: z.string().trim().min(1).max(120).optional(),
  category: publicLoanCategorySchema.optional(),
  amount: amount.optional(),
  months: duration.optional(),
  limit: z.number().int().min(1).max(24).optional(),
});

export type PublicLoanProduct = z.infer<typeof publicLoanProductSchema>;
export type PublicLoanRecord = z.infer<typeof publicLoanRecordSchema>;
export type PublicLoanSearch = z.infer<typeof publicLoanSearchSchema>;

const officialHosts = [
  'homecredit.vn',
  'shinhan.com.vn',
  'vpbank.com.vn',
  'tpb.vn',
  'fecredit.com.vn',
  'shinhanfinance.com.vn',
  'mcredit.com.vn',
  'hdsaison.com.vn',
  'techcombank.com',
  'bidv.com.vn',
] as const;

export function normalizeLoanSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export const reviewedLoanDatasetSchema = z
  .array(publicLoanRecordSchema)
  .min(1)
  .max(200)
  .superRefine((records, ctx) => {
    const ids = new Set<string>();
    const identities = new Set<string>();
    const productUrls = new Set<string>();
    for (const [index, product] of records.entries()) {
      const identity = normalizeLoanSearch(product.institution + '|' + product.name);
      if (ids.has(product.id) || identities.has(identity)) {
        ctx.addIssue({ code: 'custom', path: [index, 'id'], message: 'Duplicate loan product' });
      }
      ids.add(product.id);
      identities.add(identity);
      if (!product.sources.some((s) => s.kind === 'product-page')) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'sources'],
          message: 'Official product page required',
        });
      }
      const urls = new Set<string>();
      for (const [sourceIndex, source] of product.sources.entries()) {
        let url: URL;
        try {
          url = new URL(source.url);
        } catch {
          continue; // The source schema already reports malformed URLs.
        }
        const hostname = url.hostname.toLowerCase();
        const path = [index, 'sources', sourceIndex, 'url'];
        if (
          url.username ||
          url.password ||
          url.port ||
          !officialHosts.some((host) => hostname === host || hostname.endsWith('.' + host))
        ) {
          ctx.addIssue({ code: 'custom', path, message: 'Unrecognized official lender hostname' });
        }
        const canonical = hostname.replace(/^www\./, '') + url.pathname.replace(/\/+$/, '');
        if (urls.has(canonical) || (source.kind === 'product-page' && productUrls.has(canonical))) {
          ctx.addIssue({ code: 'custom', path, message: 'Duplicate source or product page' });
        }
        urls.add(canonical);
        if (source.kind === 'product-page') productUrls.add(canonical);
      }
    }
  });

export function loanDataCompleteness(product: PublicLoanRecord): PublicLoanProduct['completeness'] {
  const known = [
    product.amountMin !== null,
    product.amountMax !== null,
    product.monthsMin !== null,
    product.monthsMax !== null,
    product.rate !== null,
    product.method !== null,
    product.fee !== null,
    product.insurance !== null,
    product.earlyRepayment !== null,
    product.eligibility.length > 0,
  ].filter(Boolean).length;
  return { known, total: 10 };
}
