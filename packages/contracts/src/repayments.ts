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
    state: z.enum(['planned', 'active']).optional(),
  })
  .strict();

export const repaymentPaymentUpdateSchema = z
  .object({ paid: z.boolean(), confirmed: z.literal(true) })
  .strict();

export const repaymentRecordSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000_000_000),
    paidOn: z.iso.date().optional(),
    requestId: z.uuid(),
    confirmed: z.literal(true),
  })
  .strict();
export const repaymentStateUpdateSchema = z
  .object({ state: z.enum(['planned', 'active', 'archived']), confirmed: z.literal(true) })
  .strict();

const optionalMoney = z.number().int().min(0).max(1_000_000_000_000).nullable();
export const repaymentPreparationSchema = z
  .object({
    availableFunds: optionalMoney,
    incomeAmount: optionalMoney,
    incomeDay: z.number().int().min(1).max(31).nullable(),
    expensesAmount: optionalMoney,
    expensesDay: z.number().int().min(1).max(31).nullable(),
    reserve: optionalMoney,
    plannedExpenses: z
      .array(
        z.strictObject({
          id: z.uuid(),
          title: z.string().trim().min(1).max(80),
          date: z.iso.date(),
          amount: z.number().int().min(0).max(1_000_000_000_000),
        }),
      )
      .max(30),
    confirmed: z.literal(true),
  })
  .strict();
export const notificationPreferenceSchema = z
  .object({
    timeZone: z
      .string()
      .min(1)
      .max(64)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }),
    quietStart: z.number().int().min(0).max(23),
    quietEnd: z.number().int().min(0).max(23),
    remindersEnabled: z.boolean(),
    shortfallEnabled: z.boolean(),
    profileReviewEnabled: z.boolean(),
    emailEnabled: z.boolean(),
  })
  .strict();

export type TrackRepaymentInput = z.infer<typeof trackRepaymentSchema>;
export type RepaymentPaymentUpdate = z.infer<typeof repaymentPaymentUpdateSchema>;
export type RepaymentRecordInput = z.infer<typeof repaymentRecordSchema>;
export type RepaymentStateUpdate = z.infer<typeof repaymentStateUpdateSchema>;
export type RepaymentPreparationInput = z.infer<typeof repaymentPreparationSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type RepaymentPreparation =
  | { status: 'insufficient_information'; missing: string[] }
  | {
      status: 'projected';
      result: {
        dueDate: string;
        targetAmount: number;
        balanceAfterDue: number;
        requiredReserve: number;
        additionalNeeded: number;
        dailyGoal: number;
        weeklyGoal: number;
        firstShortfall: string | null;
        shortfallDays: number;
        lowestBalance: number;
        days: { date: string; balance: number }[];
      };
    };
export interface RepaymentNotification {
  id: string;
  kind:
    | 'due_7'
    | 'due_3'
    | 'due_1'
    | 'due_today'
    | 'overdue'
    | 'projected_shortfall'
    | 'low_reserve'
    | 'clustered_due'
    | 'profile_review';
  triggerDate: string;
  createdAt: string;
  readAt: string | null;
  emailStatus: string;
  repaymentId: string | null;
  period: number | null;
  title: string | null;
}
export interface NotificationCenter {
  unread: number;
  items: RepaymentNotification[];
}
export interface PaymentAuditEvent {
  id: string;
  previousAmount: number;
  newAmount: number;
  paidOn: string | null;
  createdAt: string;
}

export interface TrackedPayment extends Payment {
  paid: boolean;
  recordedAmount: number;
  remainingAmount: number;
  statusChangedAt: string | null;
}

export type RepaymentState = 'planned' | 'active' | 'completed' | 'archived';

export interface TrackedRepayment {
  id: string;
  simulationId: string;
  title: string;
  createdAt: string;
  state: RepaymentState;
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
