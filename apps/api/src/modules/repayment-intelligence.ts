import {
  BadRequestException,
  ConflictException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  repaymentPaymentUpdateSchema,
  repaymentPreparationSchema,
  repaymentRecordSchema,
  repaymentStateUpdateSchema,
  trackRepaymentSchema,
  type RepaymentPaymentUpdate,
  type RepaymentPreparationInput,
  type RepaymentRecordInput,
  type RepaymentStateUpdate,
  type TrackRepaymentInput,
} from '@finora/contracts';
import { prepareRepayment } from '@finora/financial-engine';
import { z } from 'zod';
import { Prisma } from '@finora/database';
import { Validate } from '../common/http.js';
import { db } from '../infrastructure/db.js';
import { SessionGuard, type OwnedRequest } from './auth.js';
import { readSchedule, repaymentLedger, trackedRepayment } from './repayment-model.js';
import { localDate } from './repayment-notifications.js';

const include = {
  simulation: { select: { result: true } },
  payments: { orderBy: { period: 'asc' } },
} satisfies Prisma.TrackedRepaymentInclude;
const periodSchema = z
  .string()
  .regex(/^[1-9]\d{0,2}$/)
  .transform(Number)
  .pipe(z.number().max(360));

function requireSchedule(result: unknown) {
  const rows = readSchedule(result);
  if (!rows) throw new BadRequestException('Saved simulation does not have a readable schedule');
  return rows;
}

export async function getUpcomingRepayments(userId: string, now = new Date()) {
  const [rows, preference] = await Promise.all([
    db.trackedRepayment.findMany({
      where: { userId },
      include,
      orderBy: { createdAt: 'desc' },
    }),
    db.notificationPreference.findUnique({ where: { userId }, select: { timeZone: true } }),
  ]);
  return repaymentLedger(
    rows.map((row) => trackedRepayment(row, requireSchedule(row.simulation.result))),
    now,
    preference?.timeZone ?? 'Asia/Ho_Chi_Minh',
  );
}

@Controller('api/repayments')
@UseGuards(SessionGuard)
export class RepaymentIntelligenceController {
  @Get() list(@Req() req: OwnedRequest) {
    return getUpcomingRepayments(req.userId);
  }

  @Post() async start(
    @Req() req: OwnedRequest,
    @Body(new Validate(trackRepaymentSchema)) body: TrackRepaymentInput,
  ) {
    const { userId } = req;
    const { simulationId, title, state = 'active' } = body;
    const saved = await db.loanSimulation.findFirst({
      where: { id: simulationId, userId },
      select: { result: true },
    });
    if (!saved) throw new NotFoundException();
    const schedule = requireSchedule(saved.result);
    const [, row] = await db.$transaction([
      db.trackedRepayment.createMany({
        data: [{ userId, simulationId, title, state }],
        skipDuplicates: true,
      }),
      db.trackedRepayment.findUniqueOrThrow({
        where: { userId_simulationId: { userId, simulationId } },
        include,
      }),
    ]);
    return trackedRepayment(row, schedule);
  }

  @Put(':id/payments/:period') async mark(
    @Req() req: OwnedRequest,
    @Param('id', new Validate(z.uuid())) id: string,
    @Param('period', new Validate(periodSchema)) period: number,
    @Body(new Validate(repaymentPaymentUpdateSchema)) body: RepaymentPaymentUpdate,
  ) {
    const loan = await db.trackedRepayment.findFirst({
      where: { id, userId: req.userId },
      select: { state: true, simulation: { select: { result: true } } },
    });
    if (!loan || loan.state !== 'active') throw new NotFoundException();
    const scheduled = requireSchedule(loan.simulation.result).find((row) => row.period === period);
    if (!scheduled) throw new NotFoundException();
    return updateRecord(id, period, body.paid ? scheduled.payment : 0, randomUUID());
  }

  @Put(':id/payments/:period/record') async record(
    @Req() req: OwnedRequest,
    @Param('id', new Validate(z.uuid())) id: string,
    @Param('period', new Validate(periodSchema)) period: number,
    @Body(new Validate(repaymentRecordSchema)) body: RepaymentRecordInput,
  ) {
    const loan = await db.trackedRepayment.findFirst({
      where: { id, userId: req.userId, state: 'active' },
      select: { simulation: { select: { result: true } } },
    });
    if (!loan) throw new NotFoundException();
    const scheduled = requireSchedule(loan.simulation.result).find((row) => row.period === period);
    if (!scheduled) throw new NotFoundException();
    if (body.amount > scheduled.payment)
      throw new BadRequestException('Amount exceeds scheduled payment');
    const preference = await db.notificationPreference.findUnique({
      where: { userId: req.userId },
      select: { timeZone: true },
    });
    if (
      body.paidOn &&
      body.paidOn > localDate(new Date(), preference?.timeZone ?? 'Asia/Ho_Chi_Minh')
    )
      throw new BadRequestException('Future payment date');
    return updateRecord(id, period, body.amount, body.requestId, body.paidOn);
  }

  @Get(':id/payments/:period/history') async history(
    @Req() req: OwnedRequest,
    @Param('id', new Validate(z.uuid())) id: string,
    @Param('period', new Validate(periodSchema)) period: number,
  ) {
    const owned = await db.trackedRepayment.findFirst({
      where: { id, userId: req.userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException();
    const events = await db.repaymentPaymentAudit.findMany({
      where: { repaymentId: id, period },
      select: { id: true, previousAmount: true, newAmount: true, paidOn: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return events.map((event) => ({
      id: event.id,
      previousAmount: Number(event.previousAmount),
      newAmount: Number(event.newAmount),
      paidOn: event.paidOn?.toISOString().slice(0, 10) ?? null,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  @Put(':id/state') async state(
    @Req() req: OwnedRequest,
    @Param('id', new Validate(z.uuid())) id: string,
    @Body(new Validate(repaymentStateUpdateSchema)) body: RepaymentStateUpdate,
  ) {
    const owned = await db.trackedRepayment.findFirst({
      where: { id, userId: req.userId },
      include,
    });
    if (!owned) throw new NotFoundException();
    if (
      body.state === 'planned' &&
      owned.payments.some((payment) => payment.paid || Number(payment.amount ?? 0) > 0)
    )
      throw new BadRequestException('Recorded payments prevent planned state');
    await db.trackedRepayment.updateMany({
      where: { id, userId: req.userId },
      data: { state: body.state, stateChangedAt: new Date(), preparation: Prisma.DbNull },
    });
    return trackedRepayment(
      { ...owned, state: body.state },
      requireSchedule(owned.simulation.result),
    );
  }

  @Put(':id/preparation/:period') async preparation(
    @Req() req: OwnedRequest,
    @Param('id', new Validate(z.uuid())) id: string,
    @Param('period', new Validate(periodSchema)) period: number,
    @Body(new Validate(repaymentPreparationSchema)) body: RepaymentPreparationInput,
  ) {
    const owned = await db.trackedRepayment.findFirst({
      where: { id, userId: req.userId, state: 'active' },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException();
    const missing = (
      [
        'availableFunds',
        'incomeAmount',
        'incomeDay',
        'expensesAmount',
        'expensesDay',
        'reserve',
      ] as const
    ).filter((key) => body[key] === null);
    if (missing.length) return { status: 'insufficient_information' as const, missing };
    const ledger = await getUpcomingRepayments(req.userId);
    const loan = ledger.loans.find((item) => item.id === id && item.state === 'active');
    const target = loan?.schedule.find((item) => item.period === period && !item.paid);
    if (!target) throw new NotFoundException();
    const pref = await db.notificationPreference.findUnique({ where: { userId: req.userId } });
    const start = localDate(new Date(), pref?.timeZone ?? 'Asia/Ho_Chi_Minh');
    const payments = ledger.loans
      .filter((item) => item.state === 'active')
      .flatMap((item) =>
        item.schedule
          .filter((row) => !row.paid)
          .map((row) => ({
            id: `${item.id}:${row.period}`,
            title: item.title,
            date: row.date,
            amount: row.remainingAmount,
          })),
      );
    let result: ReturnType<typeof prepareRepayment>;
    try {
      result = prepareRepayment(
        {
          start,
          opening: body.availableFunds!,
          income: { amount: body.incomeAmount!, day: body.incomeDay! },
          expense: { amount: body.expensesAmount!, day: body.expensesDay! },
          payments,
          oneOffExpenses: body.plannedExpenses,
        },
        `${id}:${period}`,
        body.reserve!,
      );
    } catch (error) {
      if (error instanceof RangeError) throw new BadRequestException(error.message);
      throw error;
    }
    await db.trackedRepayment.updateMany({
      where: { id, userId: req.userId, state: 'active' },
      data: {
        preparation: {
          period,
          input: body,
          summary: {
            dueDate: result.dueDate,
            balanceAfterDue: result.balanceAfterDue,
            additionalNeeded: result.additionalNeeded,
            firstShortfall: result.firstShortfall,
          },
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return { status: 'projected' as const, result };
  }
}

async function updateRecord(
  repaymentId: string,
  period: number,
  amount: number,
  requestId: string,
  paidOn?: string,
) {
  const perform = () =>
    db.$transaction(
      async (tx) => {
        const existingEvent = await tx.repaymentPaymentAudit.findUnique({
          where: { repaymentId_requestId: { repaymentId, requestId } },
        });
        const where = { repaymentId_period: { repaymentId, period } };
        const existing = await tx.repaymentPayment.findUnique({ where });
        const scheduled = await tx.trackedRepayment.findUniqueOrThrow({
          where: { id: repaymentId },
          select: { userId: true, simulation: { select: { result: true } } },
        });
        const payment = requireSchedule(scheduled.simulation.result)[period - 1];
        if (existingEvent) {
          if (
            existingEvent.period !== period ||
            Number(existingEvent.newAmount) !== amount ||
            (existingEvent.paidOn?.toISOString().slice(0, 10) ?? undefined) !== paidOn
          )
            throw new ConflictException('Request ID already used with different payment details');
          return {
            recordedAmount: Number(existingEvent.newAmount),
            paid: Number(existingEvent.newAmount) >= payment.payment,
            repeated: true,
            statusChangedAt: existing?.updatedAt.toISOString() ?? null,
          };
        }
        const previousAmount = Number(existing?.amount ?? (existing?.paid ? payment.payment : 0));
        if (previousAmount === amount)
          return {
            recordedAmount: amount,
            paid: amount >= payment.payment,
            repeated: true,
            statusChangedAt: existing?.updatedAt.toISOString() ?? null,
          };
        const changed = await tx.repaymentPayment.upsert({
          where,
          create: {
            repaymentId,
            period,
            amount,
            paid: amount >= payment.payment,
            paidOn: paidOn ? new Date(paidOn + 'T00:00:00Z') : null,
          },
          update: {
            amount,
            paid: amount >= payment.payment,
            paidOn: paidOn ? new Date(paidOn + 'T00:00:00Z') : null,
          },
        });
        await tx.repaymentPaymentAudit.create({
          data: {
            repaymentId,
            period,
            requestId,
            previousAmount,
            newAmount: amount,
            paidOn: paidOn ? new Date(paidOn + 'T00:00:00Z') : null,
          },
        });
        await tx.trackedRepayment.updateMany({
          where: { userId: scheduled.userId },
          data: { preparation: Prisma.DbNull },
        });
        return {
          recordedAmount: amount,
          paid: amount >= payment.payment,
          repeated: false,
          statusChangedAt: changed.updatedAt.toISOString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await perform();
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !['P2034', 'P2002'].includes(error.code) ||
        attempt === 2
      )
        throw error;
    }
  }
  throw new ConflictException('Payment update could not be serialized');
}
