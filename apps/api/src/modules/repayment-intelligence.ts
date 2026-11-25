import {
  BadRequestException,
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
import {
  repaymentPaymentUpdateSchema,
  trackRepaymentSchema,
  type RepaymentPaymentUpdate,
  type TrackRepaymentInput,
} from '@finora/contracts';
import { z } from 'zod';
import type { Prisma } from '@finora/database';
import { Validate } from '../common/http.js';
import { db } from '../infrastructure/db.js';
import { SessionGuard, type OwnedRequest } from './auth.js';
import { readSchedule, repaymentLedger, trackedRepayment } from './repayment-model.js';

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

export async function getUpcomingRepayments(userId: string) {
  const rows = await db.trackedRepayment.findMany({
    where: { userId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  return repaymentLedger(
    rows.map((row) => trackedRepayment(row, requireSchedule(row.simulation.result))),
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
    const { simulationId, title } = body;
    const saved = await db.loanSimulation.findFirst({
      where: { id: simulationId, userId },
      select: { result: true },
    });
    if (!saved) throw new NotFoundException();
    const schedule = requireSchedule(saved.result);
    const [, row] = await db.$transaction([
      db.trackedRepayment.createMany({
        data: [{ userId, simulationId, title }],
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
      select: { simulation: { select: { result: true } } },
    });
    if (
      !loan ||
      !requireSchedule(loan.simulation.result).some((payment) => payment.period === period)
    )
      throw new NotFoundException();
    const where = { repaymentId_period: { repaymentId: id, period } };
    const existing = await db.repaymentPayment.findUnique({ where });
    const payment =
      existing?.paid === body.paid
        ? existing
        : await db.repaymentPayment.upsert({
            where,
            create: { repaymentId: id, period, paid: body.paid },
            update: { paid: body.paid },
          });
    return { paid: payment.paid, statusChangedAt: payment.updatedAt.toISOString() };
  }
}
