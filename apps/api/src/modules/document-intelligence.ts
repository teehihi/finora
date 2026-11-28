import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  documentFieldNames,
  documentMimeSchema,
  documentReviewSchema,
  documentTermCorrectionSchema,
  documentSaveSchema,
  loanSchema,
  reviewedDocumentSource,
  type DocumentExtractionMode,
  type DocumentMime,
  type DocumentReview,
  type DocumentFieldName,
  type DocumentField,
  type DocumentSummary,
} from '@finora/contracts';
import { Prisma } from '@finora/database';
import { Validate } from '../common/http.js';
import { db } from '../infrastructure/db.js';
import { SessionGuard, type OwnedRequest } from './auth.js';
import {
  analyzeDocument,
  DocumentReadersBusy,
  isValidDocument,
  renderPrivatePdfPage,
} from './document-extraction.js';
import { assessDocumentRisks } from './document-risk.js';
import { normalizeConfirmedTerm } from './document-fields.js';
import { financialTools } from './tools.js';

const maxDocuments = 10;
const summarySelect = {
  id: true,
  mime: true,
  size: true,
  createdAt: true,
  synthetic: true,
  mode: true,
} as const;
const reviewSelect = { ...summarySelect, extraction: true };
const extensions: Record<DocumentMime, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function summary(row: {
  id: string;
  mime: string;
  size: number;
  createdAt: Date;
  synthetic: boolean;
  mode: string;
}): DocumentSummary {
  return {
    id: row.id,
    mime: row.mime as DocumentMime,
    createdAt: row.createdAt.toISOString(),
    size: row.size,
    synthetic: row.synthetic,
    mode: row.mode as DocumentExtractionMode,
  };
}

function review(
  row: Parameters<typeof summary>[0] & { extraction: Prisma.JsonValue },
): DocumentReview {
  const {
    fields: storedFields,
    reason,
    risks,
    pagesAnalyzed,
    truncated,
    confirmedTerms,
  } = row.extraction as unknown as Pick<
    DocumentReview,
    'fields' | 'reason' | 'risks' | 'pagesAnalyzed' | 'truncated' | 'confirmedTerms'
  >;
  const fields = {} as Record<DocumentFieldName, DocumentField>;
  for (const name of documentFieldNames)
    fields[name] = storedFields?.[name] ?? {
      state: 'missing',
      value: null,
      sources: [],
      rawValue: null,
      unit: null,
      confidence: 'none',
      extraction: 'none',
      confirmationRequired: true,
    };
  return {
    ...summary(row),
    fields,
    confirmedTerms,
    reason,
    risks: risks ?? assessDocumentRisks(fields),
    pagesAnalyzed,
    truncated,
  };
}

const extId = new ParseUUIDPipe();

async function requireOwner(id: string, userId: string) {
  const row = await db.documentAnalysis.findFirst({ where: { id, userId }, select: { id: true } });
  if (!row) throw new NotFoundException();
}

@Controller('api/document-analysis')
@UseGuards(SessionGuard)
export class DocumentIntelligenceController {
  @Get() async list(@Req() req: OwnedRequest) {
    return (
      await db.documentAnalysis.findMany({
        where: { userId: req.userId },
        select: summarySelect,
        orderBy: { createdAt: 'desc' },
        take: maxDocuments,
      })
    ).map(summary);
  }

  @Post() async upload(@Req() req: OwnedRequest) {
    const mime = documentMimeSchema.safeParse(
      req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase(),
    );
    if (!mime.success) throw new UnsupportedMediaTypeException();
    if (!Buffer.isBuffer(req.body) || !isValidDocument(req.body, mime.data))
      throw new BadRequestException('The file header or size is invalid');
    const userId = req.userId;
    const bytes: Buffer = req.body;
    if ((await db.documentAnalysis.count({ where: { userId } })) >= maxDocuments)
      throw new ConflictException();
    let value: Awaited<ReturnType<typeof analyzeDocument>>;
    try {
      value = await analyzeDocument(bytes, mime.data);
    } catch (error) {
      if (error instanceof DocumentReadersBusy) throw new ServiceUnavailableException();
      throw error;
    }
    const { mode, ...extraction } = value;
    try {
      return review(
        await db.$transaction(
          async (tx) => {
            if ((await tx.documentAnalysis.count({ where: { userId } })) >= maxDocuments)
              throw new ConflictException();
            return tx.documentAnalysis.create({
              data: {
                userId,
                mime: mime.data,
                size: bytes.length,
                content: new Uint8Array(bytes),
                synthetic: req.headers['x-finora-synthetic'] === '1',
                mode,
                extraction: JSON.parse(JSON.stringify(extraction)) as Prisma.InputJsonValue,
              },
              select: reviewSelect,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
        throw new ConflictException();
      throw error;
    }
  }

  @Get(':id') async read(@Req() req: OwnedRequest, @Param('id', extId) id: string) {
    const row = await db.documentAnalysis.findFirst({
      where: { id, userId: req.userId },
      select: reviewSelect,
    });
    if (!row) throw new NotFoundException();
    return review(row);
  }

  @Put(':id/terms/:field') async confirmTerm(
    @Req() req: OwnedRequest,
    @Param('id', extId) id: string,
    @Param('field') fieldRaw: string,
    @Body(new Validate(documentTermCorrectionSchema))
    body: typeof documentTermCorrectionSchema._output,
  ) {
    if (!documentFieldNames.includes(fieldRaw as DocumentFieldName))
      throw new BadRequestException('Unknown document field');
    const field = fieldRaw as DocumentFieldName;
    const confirmed = normalizeConfirmedTerm(field, body.rawValue);
    if (!confirmed) throw new BadRequestException('Unsupported term value or unit');
    return db.$transaction(async (tx) => {
      const row = await tx.documentAnalysis.findFirst({
        where: { id, userId: req.userId },
        select: reviewSelect,
      });
      if (!row) throw new NotFoundException();
      const extraction = row.extraction as Prisma.JsonObject;
      const previous = (extraction.confirmedTerms ?? {}) as Prisma.JsonObject;
      const updated = {
        ...extraction,
        confirmedTerms: { ...previous, [field]: confirmed },
      } as Prisma.InputJsonValue;
      await tx.documentAnalysis.updateMany({
        where: { id, userId: req.userId },
        data: { extraction: updated },
      });
      return review({ ...row, extraction: updated as Prisma.JsonValue });
    });
  }

  @Get(':id/file') async download(
    @Req() req: OwnedRequest,
    @Param('id', extId) id: string,
    @Res() res: Response,
  ) {
    const row = await db.documentAnalysis.findFirst({
      where: { id, userId: req.userId },
      select: { mime: true, content: true },
    });
    if (!row) throw new NotFoundException();
    res
      .type('application/octet-stream')
      .set(
        'Content-Disposition',
        `attachment; filename="loan-document.${extensions[row.mime as DocumentMime]}"`,
      )
      .send(Buffer.from(row.content));
  }

  @Get(':id/pages/:page') async pagePreview(
    @Req() req: OwnedRequest,
    @Param('id', extId) id: string,
    @Param('page') pageRaw: string,
    @Res() res: Response,
  ) {
    const page = Number(pageRaw);
    if (!/^\d{1,2}$/.test(pageRaw) || page < 1 || page > 20)
      throw new BadRequestException('Invalid page');
    const row = await db.documentAnalysis.findFirst({
      where: { id, userId: req.userId },
      select: { mime: true, content: true },
    });
    if (!row) throw new NotFoundException();
    if (row.mime !== 'application/pdf') throw new UnsupportedMediaTypeException();
    try {
      const image = await renderPrivatePdfPage(Buffer.from(row.content), page);
      res.type('image/png').set('Cache-Control', 'private, no-store').send(image);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new ServiceUnavailableException('PDF preview unavailable');
      throw new BadRequestException('PDF page unavailable');
    }
  }

  @Delete(':id') async delete(@Req() req: OwnedRequest, @Param('id', extId) id: string) {
    if (!(await db.documentAnalysis.deleteMany({ where: { id, userId: req.userId } })).count)
      throw new NotFoundException();
    return { deleted: true };
  }

  @Post(':id/preview') async preview(
    @Req() req: OwnedRequest,
    @Param('id', extId) id: string,
    @Body(new Validate(documentReviewSchema)) body: typeof documentReviewSchema._output,
  ) {
    await requireOwner(id, req.userId);
    return financialTools.simulateRepaymentScenario(body.input);
  }

  @Post(':id/save') async save(
    @Req() req: OwnedRequest,
    @Param('id', extId) id: string,
    @Body(new Validate(documentSaveSchema)) body: typeof documentSaveSchema._output,
  ) {
    await requireOwner(id, req.userId);
    const { input, requestId, lender = '' } = body;
    const result = financialTools.simulateRepaymentScenario(input);
    const productSnapshot = {
      id: 'reviewed-private-document',
      source: reviewedDocumentSource,
      privateSourceId: id,
      name: lender ? 'Đề nghị vay · ' + lender : 'Đề nghị vay đã kiểm tra',
      nameEn: lender ? 'Loan offer · ' + lender : 'Reviewed loan offer',
      institution: lender,
      category: 'personal',
      rateMin: input.annualRate,
      rateMax: input.annualRate,
      amountMin: input.principal,
      amountMax: input.principal,
      monthsMin: input.months,
      monthsMax: input.months,
      method: input.method,
      fee: input.fee,
    };
    const row = await db.loanSimulation.upsert({
      where: { userId_requestId: { userId: req.userId, requestId } },
      update: {},
      create: {
        userId: req.userId,
        requestId,
        productId: null,
        input,
        result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        productSnapshot,
      },
    });
    const stored = row.productSnapshot as Record<string, unknown>;
    const parsedInput = loanSchema.safeParse(row.input);
    if (
      !parsedInput.success ||
      stored.privateSourceId !== id ||
      stored.institution !== lender ||
      JSON.stringify(parsedInput.data) !== JSON.stringify(input)
    )
      throw new ConflictException();
    return { id: row.id };
  }
}
