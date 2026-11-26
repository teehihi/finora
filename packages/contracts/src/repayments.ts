import { z } from 'zod';
import type { Payment } from './index.js';

export const trackRepaymentSchema = z
  .object({
    simulationId: z.uuid(),
    title: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[^\p{Cc}\p{Cf}]+$/u),
    confirmed: z.literal(true),
  })
  .strict();

export const repaymentPaymentUpdateSchema = z
  .object({ paid: z.boolean(), confirmed: z.literal(true) })
  .strict();

export type TrackRepaymentInput = z.infer<typeof trackRepaymentSchema>;
export type RepaymentPaymentUpdate = z.infer<typeof repaymentPaymentUpdateSchema>;

export interface TrackedPayment extends Payment {
  paid: boolean;
  statusChangedAt: string | null;
}

export interface TrackedRepayment {
  id: string;
  simulationId: string;
  title: string;
  createdAt: string;
  paidPeriods: number;
  remainingPrincipal: number;
  remainingRepayment: number;
  schedule: TrackedPayment[];
}

export interface DueRepayment {
  loanId: string;
  title: string;
  payment: number;
  date: string;
  period: number;
}

export interface RepaymentLedger {
  today: string;
  through: string;
  upcoming: DueRepayment[];
  overdue: DueRepayment[];
  upcomingTotal: number;
  overdueTotal: number;
  loans: TrackedRepayment[];
}
