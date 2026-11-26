import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  draftSchema,
  saveSchema,
  saveCustomSimulationSchema,
  userScenarioSource,
  preferencesSchema,
  profileSchema,
  type Product,
  type Profile,
  type Preferences,
  type LoanInput,
  type Estimate,
} from '@finora/contracts';
import { financialTools } from './tools.js';
import { Prisma, type LoanProduct, type LoanSimulation } from '@finora/database';
import { db } from '../infrastructure/db.js';
import { Validate } from '../common/http.js';
import { SessionGuard, type OwnedRequest } from './auth.js';

function productDto(p: LoanProduct): Product {
  return {
    ...p,
    amountMin: Number(p.amountMin),
    amountMax: Number(p.amountMax),
    fee: p.fee === null ? null : Number(p.fee),
    category: p.category as Product['category'],
    method: p.method as Product['method'],
  };
}
function savedDto(s: LoanSimulation) {
  return {
    id: s.id,
    product: s.productSnapshot,
    input: s.input,
    result: s.result,
    createdAt: s.createdAt,
  };
}
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
@Injectable()
export class PlanningService {
  async product(id: string) {
    const p = await db.loanProduct.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return productDto(p);
  }
  async calculate(productId: string, input: LoanInput) {
    const p = await this.product(productId);
    if (
      input.principal < p.amountMin ||
      input.principal > p.amountMax ||
      input.months < p.monthsMin ||
      input.months > p.monthsMax ||
      input.annualRate < p.rateMin ||
      input.annualRate > p.rateMax ||
      input.method !== p.method ||
      input.fee !== p.fee
    )
      throw new BadRequestException('Outside sample terms');
    return { product: p, result: financialTools.simulateRepaymentScenario(input) };
  }
  async save(userId: string, requestId: string, productId: string, input: LoanInput) {
    const { product, result } = await this.calculate(productId, input);
    const row = await db.loanSimulation.upsert({
      where: { userId_requestId: { userId, requestId } },
      create: {
        userId,
        requestId,
        productId,
        input: json(input),
        result: json(result),
        productSnapshot: json(product),
      },
      update: {},
    });
    return savedDto(row);
  }
  async saveCustom(userId: string, requestId: string, input: LoanInput) {
    const result = financialTools.simulateRepaymentScenario(input);
    const product: Product = {
      id: 'personal-scenario',
      name: 'Phương án của bạn',
      nameEn: 'Your scenario',
      institution: 'Finora',
      category: 'personal',
      amountMin: input.principal,
      amountMax: input.principal,
      monthsMin: input.months,
      monthsMax: input.months,
      rateMin: input.annualRate,
      rateMax: input.annualRate,
      method: input.method,
      fee: input.fee,
      source: userScenarioSource,
    };
    const row = await db.loanSimulation.upsert({
      where: { userId_requestId: { userId, requestId } },
      create: {
        userId,
        requestId,
        productId: null,
        input: json(input),
        result: json(result),
        productSnapshot: json(product),
      },
      update: {},
    });
    return savedDto(row);
  }
  async facts(userId: string, id: string) {
    const x = await db.loanSimulation.findFirst({ where: { userId, id } });
    if (!x) throw new NotFoundException();
    const r = x.result as unknown as Estimate;
    return financialTools.explainSavedSimulation(r);
  }
}
@Controller('api')
@UseGuards(SessionGuard)
export class PlanningController {
  constructor(@Inject(PlanningService) private planning: PlanningService) {}
  @Get('account') async account(@Req() req: OwnedRequest) {
    const row = await db.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { locale: true, appearance: true, profile: true },
    });
    const p = row.profile;
    const profile = p
      ? { income: Number(p.income), debt: Number(p.debt), expenses: Number(p.expenses) }
      : null;
    return {
      preferences: { locale: row.locale, appearance: row.appearance },
      profile,
      readiness: profile ? financialTools.analyzeFinancialProfile(profile) : null,
    };
  }
  @Put('profile') async profile(
    @Req() req: OwnedRequest,
    @Body(new Validate(profileSchema)) input: Profile,
  ) {
    await db.financialProfile.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId, ...input },
      update: input,
    });
    return input;
  }
  @Put('preferences') async preferences(
    @Req() req: OwnedRequest,
    @Body(new Validate(preferencesSchema)) input: Preferences,
  ) {
    await db.user.update({ where: { id: req.userId }, data: input });
    return input;
  }
  @Get('catalog') async catalog() {
    return (await db.loanProduct.findMany({ orderBy: { id: 'asc' } })).map(productDto);
  }
  @Get('catalog/:id') product(@Param('id') id: string) {
    return this.planning.product(id);
  }
  @Post('simulations/preview') async preview(
    @Body(new Validate(draftSchema)) body: typeof draftSchema._output,
  ) {
    return (await this.planning.calculate(body.productId, body.input)).result;
  }
  @Post('simulations') save(
    @Req() req: OwnedRequest,
    @Body(new Validate(saveSchema)) body: typeof saveSchema._output,
  ) {
    return this.planning.save(req.userId, body.requestId, body.productId, body.input);
  }
  @Post('simulations/custom') saveCustom(
    @Req() req: OwnedRequest,
    @Body(new Validate(saveCustomSimulationSchema)) body: typeof saveCustomSimulationSchema._output,
  ) {
    return this.planning.saveCustom(req.userId, body.requestId, body.input);
  }
  @Get('simulations') async list(@Req() req: OwnedRequest) {
    return (
      await db.loanSimulation.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
      })
    ).map(savedDto);
  }
  @Get('simulations/:id') async detail(@Req() req: OwnedRequest, @Param('id') id: string) {
    const row = await db.loanSimulation.findFirst({ where: { id, userId: req.userId } });
    if (!row) throw new NotFoundException();
    return savedDto(row);
  }
}
