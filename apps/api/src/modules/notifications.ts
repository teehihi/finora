import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { notificationPreferenceSchema, type NotificationPreference } from '@finora/contracts';
import { db } from '../infrastructure/db.js';
import { Validate } from '../common/http.js';
import { SessionGuard, type OwnedRequest } from './auth.js';
import {
  defaultNotificationPreference,
  deliverReminderEmails,
  syncUserNotifications,
} from './notification-service.js';
import { env } from '../config/env.js';

@Controller('api/notifications')
@UseGuards(SessionGuard)
export class NotificationController {
  @Get('capabilities') async capabilities(@Req() req: OwnedRequest) {
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { emailVerified: true },
    });
    return { email: env.FINORA_REMINDER_EMAIL_ENABLED && user.emailVerified, push: false };
  }
  @Get('preferences') async preferences(@Req() req: OwnedRequest) {
    const stored = await db.notificationPreference.findUnique({ where: { userId: req.userId } });
    if (!stored) return defaultNotificationPreference;
    return {
      timeZone: stored.timeZone,
      quietStart: stored.quietStart,
      quietEnd: stored.quietEnd,
      remindersEnabled: stored.remindersEnabled,
      shortfallEnabled: stored.shortfallEnabled,
      profileReviewEnabled: stored.profileReviewEnabled,
      emailEnabled: stored.emailEnabled,
    };
  }

  @Put('preferences') async savePreferences(
    @Req() req: OwnedRequest,
    @Body(new Validate(notificationPreferenceSchema)) body: NotificationPreference,
  ) {
    const stored = await db.notificationPreference.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId, ...body },
      update: body,
    });
    const settings = {
      timeZone: stored.timeZone,
      quietStart: stored.quietStart,
      quietEnd: stored.quietEnd,
      remindersEnabled: stored.remindersEnabled,
      shortfallEnabled: stored.shortfallEnabled,
      profileReviewEnabled: stored.profileReviewEnabled,
      emailEnabled: stored.emailEnabled,
    };
    await syncUserNotifications(req.userId);
    return settings;
  }

  @Get() async list(@Req() req: OwnedRequest) {
    await syncUserNotifications(req.userId);
    await deliverReminderEmails();
    const rows = await db.repaymentNotification.findMany({
      where: { userId: req.userId, status: { in: ['delivered', 'read'] } },
      select: {
        id: true,
        kind: true,
        triggerDate: true,
        createdAt: true,
        readAt: true,
        emailStatus: true,
        repaymentId: true,
        period: true,
        repayment: { select: { title: true } },
      },
      orderBy: { scheduledFor: 'desc' },
      take: 100,
    });
    return {
      unread: rows.filter((row) => !row.readAt).length,
      items: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        triggerDate: row.triggerDate.toISOString().slice(0, 10),
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
        emailStatus: row.emailStatus,
        repaymentId: row.repaymentId,
        period: row.period,
        title: row.repayment?.title ?? null,
      })),
    };
  }

  @Put(':id/read') async read(
    @Req() req: OwnedRequest,
    @Param('id', new Validate(z.uuid())) id: string,
  ) {
    const changed = await db.repaymentNotification.updateMany({
      where: { id, userId: req.userId, status: { in: ['delivered', 'read'] } },
      data: { status: 'read', readAt: new Date() },
    });
    if (!changed.count) throw new NotFoundException();
    return { read: true };
  }
}
