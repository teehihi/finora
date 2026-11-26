import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  loanDataCompleteness,
  normalizeLoanSearch,
  publicLoanIdSchema,
  publicLoanSearchSchema,
  reviewedLoanDatasetSchema,
  type PublicLoanProduct,
  type PublicLoanSearch,
} from '@finora/contracts';
import dataset from '../catalog/loans.vn.json' with { type: 'json' };
import { Validate } from '../common/http.js';
import { SessionGuard } from './auth.js';

const products: readonly PublicLoanProduct[] = reviewedLoanDatasetSchema
  .parse(dataset)
  .map((p) => ({ ...p, completeness: loanDataCompleteness(p) }));
const productsById = new Map(products.map((p) => [p.id, p]));

export function searchPublicLoans(filters: PublicLoanSearch = {}): PublicLoanProduct[] {
  const { query, category, amount, months, limit = 12 } = publicLoanSearchSchema.parse(filters);
  const terms = query ? normalizeLoanSearch(query).split(/\s+/) : [];
  return products
    .filter((p) => {
      if (category && p.category !== category) return false;
      if (amount !== undefined) {
        if (p.amountMin !== null && amount < p.amountMin) return false;
        if (p.amountMax !== null && amount > p.amountMax) return false;
      }
      if (months !== undefined) {
        if (p.monthsMin !== null && months < p.monthsMin) return false;
        if (p.monthsMax !== null && months > p.monthsMax) return false;
      }
      const haystack = normalizeLoanSearch(
        [p.name, p.nameEn, p.institution, ...p.purposes, ...p.purposesEn].join(' '),
      );
      // Unknown bounds keep a product discoverable; they never confirm a match.
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, limit);
}

export function getPublicLoan(id: string): PublicLoanProduct | undefined {
  return productsById.get(id);
}

const queryRecord = z
  .strictObject({
    query: z.string().optional(),
    category: z.string().optional(),
    amount: z
      .string()
      .regex(/^\d{1,13}$/)
      .transform(Number)
      .optional(),
    months: z
      .string()
      .regex(/^\d{1,3}$/)
      .transform(Number)
      .optional(),
    limit: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .optional(),
  })
  .pipe(publicLoanSearchSchema);

@Controller('api/intelligence/catalog')
@UseGuards(SessionGuard)
export class CatalogIntelligenceController {
  @Get()
  list(@Query(new Validate(queryRecord)) filters: PublicLoanSearch) {
    return searchPublicLoans(filters);
  }

  @Get(':id')
  detail(@Param('id', new Validate(publicLoanIdSchema)) id: string) {
    const p = getPublicLoan(id);
    if (!p) throw new NotFoundException();
    return p;
  }
}
