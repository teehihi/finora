import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
  BadRequestException,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Res,
  Param,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { env } from '../config/env.js';
import { db } from './db.js';
import { SessionGuard, type OwnedRequest } from '../modules/auth.js';
export interface StorageProvider {
  put(owner: string, file: Buffer): Promise<string>;
  read(owner: string, id: string): Promise<Buffer>;
}
export const STORAGE = Symbol('StorageProvider');
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private root = resolve(env.LOCAL_STORAGE_PATH);
  async put(owner: string, file: Buffer) {
    if (!Buffer.isBuffer(file) || file.length === 0 || file.length > 65536)
      throw new BadRequestException();
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(file);
    } catch {
      throw new UnsupportedMediaTypeException();
    }
    const id = randomUUID();
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const path = join(this.root, id);
    await writeFile(path, file, { flag: 'wx', mode: 0o600 });
    try {
      await db.uploadedDocument.create({ data: { id, userId: owner, size: file.length } });
    } catch (e) {
      await unlink(path);
      throw e;
    }
    return id;
  }
  async read(owner: string, id: string) {
    const row = await db.uploadedDocument.findFirst({ where: { id, userId: owner } });
    if (!row) throw new NotFoundException();
    return readFile(join(this.root, row.id));
  }
}
@Controller('api/documents')
@UseGuards(SessionGuard)
export class DocumentsController {
  constructor(@Inject(STORAGE) private storage: StorageProvider) {}
  @Post() async upload(@Req() req: OwnedRequest) {
    if (!req.is('text/plain') || req.headers['x-finora-synthetic'] !== '1')
      throw new UnsupportedMediaTypeException();
    return { id: await this.storage.put(req.userId, req.body) };
  }
  @Get(':id') async read(
    @Req() req: OwnedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    res
      .type('text/plain')
      .set('Content-Disposition', 'attachment; filename="fixture.txt"')
      .send(await this.storage.read(req.userId, id));
  }
}
