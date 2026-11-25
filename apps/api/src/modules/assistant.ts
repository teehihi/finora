import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  Body,
  UseGuards,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import { setTimeout as pause } from 'node:timers/promises';
import { chatSchema, type ChatRequest, type ChatTurn } from '@finora/contracts';
import { db } from '../infrastructure/db.js';
import { Validate } from '../common/http.js';
import { SessionGuard, type OwnedRequest } from './auth.js';
import { PlanningService } from './planning.js';

type Facts = ChatTurn['facts'];
export interface AIProvider {
  readonly id: string;
  stream(request: ChatRequest, facts: Facts, signal: AbortSignal): AsyncIterable<string>;
}
export const AI_PROVIDER = Symbol('AIProvider');
@Injectable()
export class MockProvider implements AIProvider {
  readonly id = 'mock';
  async *stream(req: ChatRequest, facts: Facts, signal: AbortSignal) {
    const vi = req.locale === 'vi-VN';
    const fmt = (n: number) =>
      new Intl.NumberFormat(req.locale, { style: 'currency', currency: 'VND' }).format(n);
    const answer = facts
      ? (vi
          ? 'Kỳ đầu tiên là ' +
            fmt(facts.firstPayment) +
            '. Tổng gốc và lãi theo lịch là ' +
            fmt(facts.repayment) +
            '.'
          : 'The first payment is ' +
            fmt(facts.firstPayment) +
            '. Scheduled principal and interest total ' +
            fmt(facts.repayment) +
            '.') +
        ' ' +
        (facts.total === null
          ? vi
            ? 'Phí chưa xác định, nên tổng chi phí cuối cùng còn để mở.'
            : 'Fees are unknown, so the final cost remains open.'
          : (vi ? 'Tổng tiền gồm phí là ' : 'Including fees, the total is ') +
            fmt(facts.total) +
            '.')
      : /phí|fee|cost|chi phí/i.test(req.prompt)
        ? vi
          ? 'Hãy xem riêng tiền gốc, tiền lãi và phí. Phí chưa công bố sẽ được đánh dấu trong bản mô phỏng.'
          : 'Review principal, interest and fees separately. Unknown fees are flagged in a simulation.'
        : /lãi|interest|balance/i.test(req.prompt)
          ? vi
            ? 'Lãi trên dư nợ giảm dần được tính từ số gốc còn lại ở đầu mỗi kỳ. Mở một lịch trả nợ để xem tiền gốc và lãi từng tháng.'
            : 'Reducing-balance interest uses the opening balance each month. Open a repayment schedule to see principal and interest separately.'
          : vi
            ? 'Bạn có thể chọn một sản phẩm mẫu, điều chỉnh số tiền và kỳ hạn, rồi lưu bản mô phỏng. Chọn bản đã lưu tại đây để xem giải thích từ các số liệu đã tính.'
            : 'Choose a sample product, adjust the amount and term, then save the simulation. Select a saved plan here for an explanation of its calculated values.';
    for (const part of answer.match(/\S+\s*/gu) ?? []) {
      await pause(22, undefined, { signal });
      yield part;
    }
  }
}
@Controller('api/assistant')
@UseGuards(SessionGuard)
export class AssistantController {
  constructor(
    @Inject(PlanningService) private planning: PlanningService,
    @Inject(AI_PROVIDER) private provider: AIProvider,
  ) {}
  @Delete('history') async clear(@Req() req: OwnedRequest) {
    const result = await db.chatTurn.deleteMany({ where: { userId: req.userId } });
    return { removed: result.count };
  }
  @Get('history') history(@Req() req: OwnedRequest) {
    return db.chatTurn.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        prompt: true,
        answer: true,
        locale: true,
        createdAt: true,
        provider: true,
        simulationId: true,
        facts: true,
      },
    });
  }
  @Post('stream') async stream(
    @Req() req: OwnedRequest,
    @Body(new Validate(chatSchema)) input: ChatRequest,
    @Res() res: Response,
  ) {
    const userId = req.userId;
    const facts = input.simulationId ? await this.planning.facts(userId, input.simulationId) : null;
    const prior = await db.chatTurn.findUnique({
      where: { userId_requestId: { userId, requestId: input.requestId } },
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    res.on('close', () => controller.abort());
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const send = (data: unknown) => res.write('data: ' + JSON.stringify(data) + '\n\n');
    try {
      send({ type: 'meta', provider: this.provider.id, facts: prior?.facts ?? facts });
      let answer = '';
      if (prior) {
        send({ type: 'delta', text: prior.answer });
      } else {
        for await (const chunk of this.provider.stream(input, facts, controller.signal)) {
          answer += chunk;
          send({ type: 'delta', text: chunk });
        }
        controller.signal.throwIfAborted();
        await db.chatTurn.upsert({
          where: { userId_requestId: { userId, requestId: input.requestId } },
          create: {
            userId,
            requestId: input.requestId,
            prompt: input.prompt,
            locale: input.locale,
            provider: this.provider.id,
            simulationId: input.simulationId,
            answer,
            ...(facts ? { facts } : {}),
          },
          update: {},
        });
      }
      send({ type: 'done' });
    } catch {
      if (!res.destroyed) send({ type: 'error' });
    } finally {
      clearTimeout(timeout);
      res.end();
    }
  }
}
