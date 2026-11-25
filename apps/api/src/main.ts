import 'reflect-metadata';
import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { db } from './infrastructure/db.js';
import { auth, SessionGuard } from './modules/auth.js';
import { PlanningController, PlanningService } from './modules/planning.js';
import { AssistantController, AI_PROVIDER, MockProvider } from './modules/assistant.js';
import { DocumentsController, LocalStorageProvider, STORAGE } from './infrastructure/storage.js';
import { SafeErrors, requestLog, logger } from './common/http.js';

@Controller('health')
class Health {
  @Get() async status() {
    try {
      await db.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ready', ai: env.AI_PROVIDER };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
@Module({ controllers: [Health] })
class HealthModule {}
@Module({
  controllers: [PlanningController, AssistantController, DocumentsController],
  providers: [
    SessionGuard,
    PlanningService,
    { provide: AI_PROVIDER, useClass: MockProvider },
    { provide: STORAGE, useClass: LocalStorageProvider },
  ],
})
class FinanceModule {}
@Module({ imports: [HealthModule, FinanceModule] })
class AppModule {}
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['warn', 'error'],
  });
  app.use(requestLog, helmet());
  app.enableCors({
    origin: env.WEB_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (
      origin &&
      !env.WEB_ORIGINS.includes(origin) &&
      origin !== env.BETTER_AUTH_URL &&
      origin !== 'finora://'
    )
      return res.sendStatus(403);
    next();
  });
  server.use(
    '/api/auth',
    rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  server.all('/api/auth/*splat', toNodeHandler(auth));
  server.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false }),
    express.json({ limit: '24kb' }),
  );
  server.use('/api/documents', express.raw({ type: 'text/plain', limit: '64kb' }));
  server.use(
    (
      err: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.status ?? 400).json({ message: 'Invalid request body' });
    },
  );
  app.useGlobalFilters(new SafeErrors());
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Finora local API')
        .setVersion('0.1')
        .addCookieAuth('finora.session_token')
        .build(),
    ),
  );
  await db.$connect();
  await app.listen(env.PORT, env.HOST);
  logger.info({ port: env.PORT }, 'Finora API ready');
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, async () => {
      await app.close();
      await db.$disconnect();
      process.exit(0);
    });
}
void main().catch((error: unknown) => {
  logger.error({ type: error instanceof Error ? error.name : 'unknown' }, 'API startup failed');
  process.exit(1);
});
