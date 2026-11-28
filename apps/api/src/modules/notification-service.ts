import { db } from '../infrastructure/db.js';
import { env } from '../config/env.js';
import { emailService } from '../infrastructure/email.js';
import { getUpcomingRepayments } from './repayment-intelligence.js';
import {
  clusteredDueKey,
  currentNotificationRows,
  isQuietHour,
  localDate,
  planNotificationRows,
  zonedHour,
  type PlannedNotification,
} from './repayment-notifications.js';

export const defaultNotificationPreference = {
  timeZone: 'Asia/Ho_Chi_Minh',
  quietStart: 22,
  quietEnd: 8,
  remindersEnabled: true,
  shortfallEnabled: true,
  profileReviewEnabled: false,
  emailEnabled: false,
} as const;

const day = (date: string, offset: number) => {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};

export async function syncUserNotifications(userId: string, now = new Date()) {
  const preference = await db.notificationPreference.findUnique({ where: { userId } });
  const settings = preference ?? defaultNotificationPreference;
  const today = localDate(now, settings.timeZone);
  const ledger = await getUpcomingRepayments(userId, now);
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { emailVerified: true },
  });
  const canEmail = settings.emailEnabled && user.emailVerified && env.FINORA_REMINDER_EMAIL_ENABLED;
  const planned: PlannedNotification[] = settings.remindersEnabled
    ? currentNotificationRows(planNotificationRows(ledger.loans, settings.timeZone), today)
    : [];
  if (settings.remindersEnabled) {
    const clusterKey = clusteredDueKey(ledger.upcoming, today);
    if (clusterKey)
      planned.push({
        kind: 'clustered_due',
        repaymentId: null,
        period: null,
        dedupKey: clusterKey,
        triggerDate: today,
        scheduledFor: zonedHour(today, 8, settings.timeZone),
      });
  }
  if (settings.profileReviewEnabled) {
    const profile = await db.financialProfile.findUnique({
      where: { userId },
      select: { updatedAt: true },
    });
    const profileDay = profile?.updatedAt.toISOString().slice(0, 10) ?? null;
    if (!profileDay || profileDay <= day(today, -90))
      planned.push({
        kind: 'profile_review',
        repaymentId: null,
        period: null,
        dedupKey: `profile_review:${profileDay ?? 'missing'}:${today.slice(0, 7)}`,
        triggerDate: today,
        scheduledFor: zonedHour(today, 8, settings.timeZone),
      });
  }
  if (settings.shortfallEnabled) {
    const rows = await db.trackedRepayment.findMany({
      where: { userId, state: 'active' },
      select: { id: true, preparation: true },
    });
    for (const row of rows) {
      const stored = row.preparation as {
        period?: number;
        summary?: {
          balanceAfterDue?: number;
          additionalNeeded?: number;
          dueDate?: string;
          firstShortfall?: string | null;
        };
        updatedAt?: string;
      } | null;
      if (!stored?.summary || !stored.summary.dueDate || stored.summary.dueDate < today) continue;
      const term = ledger.loans
        .find((loan) => loan.id === row.id)
        ?.schedule.find((payment) => payment.period === stored.period);
      if (!term || term.paid) continue;
      const kind =
        (stored.summary.balanceAfterDue ?? 0) < 0
          ? 'projected_shortfall'
          : (stored.summary.additionalNeeded ?? 0) > 0
            ? 'low_reserve'
            : null;
      if (!kind) continue;
      planned.push({
        kind,
        repaymentId: row.id,
        period: stored.period ?? null,
        dedupKey: `${row.id}:${stored.period}:${kind}:${stored.updatedAt ?? ''}`,
        triggerDate: today,
        scheduledFor: zonedHour(today, 8, settings.timeZone),
      });
    }
  }
  const sentToday =
    canEmail &&
    (await db.repaymentNotification.findFirst({
      where: { userId, triggerDate: new Date(today + 'T00:00:00Z'), emailStatus: 'sent' },
      select: { id: true },
    }));
  const chosenEmailKey =
    canEmail && !sentToday ? planned.find((row) => row.triggerDate === today)?.dedupKey : undefined;
  if (planned.length)
    await db.repaymentNotification.createMany({
      data: planned.map((row) => ({
        userId,
        repaymentId: row.repaymentId,
        period: row.period,
        kind: row.kind,
        dedupKey: row.dedupKey,
        triggerDate: new Date(row.triggerDate + 'T00:00:00Z'),
        scheduledFor: row.scheduledFor,
        emailStatus: row.dedupKey === chosenEmailKey ? 'pending' : 'disabled',
      })),
      skipDuplicates: true,
    });
  const activeKeys = new Set(planned.map((row) => row.dedupKey));
  const currentKeys = planned.filter((row) => row.triggerDate === today).map((row) => row.dedupKey);
  if (chosenEmailKey)
    await db.repaymentNotification.updateMany({
      where: {
        userId,
        dedupKey: chosenEmailKey,
        emailStatus: 'disabled',
        status: { in: ['queued', 'delivered', 'read'] },
      },
      data: { emailStatus: 'pending' },
    });
  if (currentKeys.length)
    await db.repaymentNotification.updateMany({
      where: {
        userId,
        dedupKey: { in: currentKeys.filter((key) => key !== chosenEmailKey) },
        emailStatus: 'pending',
      },
      data: { emailStatus: 'disabled' },
    });
  const queued = await db.repaymentNotification.findMany({
    where: { userId, status: 'queued' },
    select: { id: true, dedupKey: true },
  });
  const stale = queued.filter((row) => !activeKeys.has(row.dedupKey)).map((row) => row.id);
  if (stale.length)
    await db.repaymentNotification.updateMany({
      where: { id: { in: stale }, userId, status: 'queued' },
      data: { status: 'canceled', emailStatus: 'disabled' },
    });
  await db.repaymentNotification.updateMany({
    where: { userId, status: 'queued', scheduledFor: { lte: now } },
    data: { status: 'delivered' },
  });
}

export async function deliverReminderEmails(now = new Date()) {
  if (!env.FINORA_REMINDER_EMAIL_ENABLED) return;
  const candidates = await db.repaymentNotification.findMany({
    where: {
      status: { in: ['delivered', 'read'] },
      emailStatus: { in: ['pending', 'failed', 'sending'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    include: {
      user: { select: { email: true, emailVerified: true, notificationPreference: true } },
    },
    take: 25,
    orderBy: { createdAt: 'asc' },
  });
  for (const item of candidates) {
    const preference = item.user.notificationPreference;
    if (!preference?.emailEnabled || !item.user.emailVerified) {
      await db.repaymentNotification.updateMany({
        where: { id: item.id },
        data: { emailStatus: 'disabled' },
      });
      continue;
    }
    if (isQuietHour(now, preference.timeZone, preference.quietStart, preference.quietEnd)) continue;
    const claim = await db.repaymentNotification.updateMany({
      where: { id: item.id, emailStatus: item.emailStatus },
      data: {
        emailStatus: 'sending',
        emailAttempts: { increment: 1 },
        nextRetryAt: new Date(now.getTime() + 10 * 60_000),
      },
    });
    if (!claim.count) continue;
    try {
      await emailService.sendReminder(item.user.email);
      await db.repaymentNotification.update({
        where: { id: item.id },
        data: { emailStatus: 'sent', emailedAt: new Date(), nextRetryAt: null },
      });
    } catch {
      const attempts = item.emailAttempts + 1;
      await db.repaymentNotification.update({
        where: { id: item.id },
        data: {
          emailStatus: attempts >= 3 ? 'failed_permanent' : 'failed',
          nextRetryAt: attempts >= 3 ? null : new Date(now.getTime() + attempts * 15 * 60_000),
        },
      });
    }
  }
}

export async function sweepNotifications(now = new Date()) {
  let cursor: string | undefined;
  for (;;) {
    const users = await db.user.findMany({
      where: {
        OR: [
          { trackedRepayments: { some: {} } },
          { notificationPreference: { is: { profileReviewEnabled: true } } },
        ],
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const user of users) await syncUserNotifications(user.id, now);
    if (users.length < 100) break;
    cursor = users.at(-1)?.id;
  }
  await deliverReminderEmails(now);
}
