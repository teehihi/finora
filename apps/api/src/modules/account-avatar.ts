import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Get,
  Put,
  Req,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
  UseGuards,
} from '@nestjs/common';
import { avatarMime, type AccountAvatar } from '@finora/contracts';
import { db } from '../infrastructure/db.js';
import { avatarStorage } from '../infrastructure/avatar-storage.js';
import { logger } from '../common/http.js';
import { SessionGuard, type OwnedRequest } from './auth.js';
import { AvatarImageBusy, normalizeAvatar } from './avatar-image.js';

function photo(bytes: Buffer): AccountAvatar {
  return { dataUrl: 'data:image/jpeg;base64,' + bytes.toString('base64') };
}
async function cleanup(key: string) {
  try {
    await avatarStorage.remove(key);
  } catch {
    logger.warn('obsolete avatar cleanup failed');
  }
}
@Controller('api/account/avatar')
@UseGuards(SessionGuard)
export class AccountAvatarController {
  @Get()
  async get(@Req() req: OwnedRequest): Promise<AccountAvatar> {
    const select = () => db.accountAvatar.findUnique({ where: { userId: req.userId } });
    try {
      const current = await select();
      if (!current) return { dataUrl: null };
      const bytes = await avatarStorage.get(current.objectKey);
      if (bytes) return photo(bytes);
      // A concurrent replacement may have retired the object after our select.
      const newer = await select();
      if (newer && newer.objectKey !== current.objectKey) {
        const latest = await avatarStorage.get(newer.objectKey);
        if (latest) return photo(latest);
      }
    } catch {
      throw new ServiceUnavailableException();
    }
    throw new ServiceUnavailableException();
  }

  @Put()
  async put(@Req() req: OwnedRequest): Promise<AccountAvatar> {
    const mime = req.get('content-type')?.split(';')[0]?.trim();
    if (!avatarMime(mime)) throw new UnsupportedMediaTypeException();
    if (!Buffer.isBuffer(req.body)) throw new BadRequestException();
    let image: Buffer | null;
    try {
      image = await normalizeAvatar(req.body, mime);
    } catch (error) {
      if (error instanceof AvatarImageBusy) throw new ServiceUnavailableException();
      throw error;
    }
    if (!image) throw new BadRequestException('Invalid avatar image');
    const key =
      'avatars/' +
      createHash('sha256').update(req.userId).digest('hex') +
      '/' +
      randomUUID() +
      '.jpg';
    try {
      await avatarStorage.put(key, image);
    } catch {
      await cleanup(key);
      throw new ServiceUnavailableException();
    }
    let old: string | undefined;
    try {
      old = await db.$transaction(async (tx) => {
        // Serialize replacements by owner. Only the pointer, not image bytes, is in PostgreSQL.
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${req.userId} FOR UPDATE`;
        const before = await tx.accountAvatar.findUnique({ where: { userId: req.userId } });
        await tx.accountAvatar.upsert({
          where: { userId: req.userId },
          update: { objectKey: key },
          create: { userId: req.userId, objectKey: key },
        });
        return before?.objectKey;
      });
    } catch {
      // On service/database failure the old pointer remains valid. Do not
      // delete this object: a lost commit response can mask a successful write.
      throw new ServiceUnavailableException();
    }
    if (old) await cleanup(old);
    return photo(image);
  }
}
