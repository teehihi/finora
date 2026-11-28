import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

const base = 'http://localhost:3000/api';
const inbox = 'http://127.0.0.1:8025';
async function mailMessages(request: APIRequestContext, address: string) {
  const query = new URLSearchParams({ query: `to:${address}`, limit: '20' });
  const response = await request.get(`${inbox}/api/v1/search?${query}`);
  if (!response.ok()) throw new Error(`Mailpit search returned ${response.status()}`);
  const { messages } = (await response.json()) as { messages?: { ID: string }[] };
  return Promise.all(
    (messages ?? []).map(async ({ ID }) => {
      const message = await request.get(`${inbox}/api/v1/message/${ID}`);
      return (await message.json()) as { Subject: string; Text: string; To: { Address: string }[] };
    }),
  );
}
const shift = (date: string, days: number) => {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

test('partial correction audit and idempotent owner-only in-app reminders', async ({
  context,
  request,
  page,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Phase 5 synthetic',
        email: `phase5-${randomUUID()}@example.test`,
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await createLegacyAccount(request, {
        name: 'Other synthetic',
        email: `phase5-other-${randomUUID()}@example.test`,
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  const today = (await (await context.request.get(base + '/repayments')).json()).today as string;
  const saved = await context.request.post(base + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 12_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: shift(today, -1),
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const simulation = await saved.json();
  const planned = await context.request.post(base + '/repayments', {
    data: {
      simulationId: simulation.id,
      title: 'Synthetic obligation',
      state: 'planned',
      confirmed: true,
    },
  });
  expect(planned.ok()).toBe(true);
  const { id } = await planned.json();
  expect((await (await context.request.get(base + '/repayments')).json()).overdue).toHaveLength(0);
  expect(
    (await (await context.request.get(base + '/notifications')).json()).items.some(
      (item: { repaymentId: string }) => item.repaymentId === id,
    ),
  ).toBe(false);
  expect(
    (
      await context.request.put(base + `/repayments/${id}/state`, {
        data: { state: 'active', confirmed: true },
      })
    ).ok(),
  ).toBe(true);
  const notices = await (await context.request.get(base + '/notifications')).json();
  expect(
    notices.items.some(
      (item: { repaymentId: string; kind: string }) =>
        item.repaymentId === id && item.kind === 'overdue',
    ),
  ).toBe(true);
  const again = await (await context.request.get(base + '/notifications')).json();
  expect(again.items.map((item: { id: string }) => item.id)).toEqual(
    notices.items.map((item: { id: string }) => item.id),
  );
  const fin = await context.request.post(base + '/intelligence/stream', {
    data: {
      requestId: randomUUID(),
      prompt: 'Khoản trả nợ sắp tới của tôi là gì?',
      locale: 'vi-VN',
      externalConsent: false,
    },
  });
  expect(fin.ok()).toBe(true);
  const events = (await fin.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map(
      (line) =>
        JSON.parse(line.slice(6)) as {
          type: string;
          blocks?: { kind: string; next?: { loanId: string } }[];
        },
    );
  expect(
    events
      .find((event) => event.type === 'structured')
      ?.blocks?.some((block) => block.kind === 'repayment_monitor' && block.next?.loanId === id),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: 'Thông báo' })).toBeVisible();
  await expect(page.getByText('Kỳ trả quá hạn theo lịch, chưa ghi nhận').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Khoản vay' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.screenshot({ path: info.outputPath('notifications-mobile.png') });
  await page.getByRole('button', { name: 'Tùy chọn lời nhắc' }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Tùy chọn lời nhắc' })
      .getByText('Thông báo đẩy chưa được cấu hình trên thiết bị này.'),
  ).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Tùy chọn lời nhắc' })
    .getByRole('button', { name: /Đóng|Close/ })
    .click();
  const englishDark = await page.request.put(base + '/preferences', {
    data: { locale: 'en-US', appearance: 'dark' },
  });
  expect(englishDark.ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByText('Scheduled payment overdue and unrecorded')).toBeVisible();
  const settingsButton = page.getByRole('button', { name: 'Reminder preferences' });
  await settingsButton.focus();
  await expect(settingsButton).toBeFocused();
  await page.screenshot({ path: info.outputPath('notifications-english-dark-mobile.png') });
  expect(
    (await (await request.get(base + '/notifications')).json()).items.some(
      (item: { repaymentId: string }) => item.repaymentId === id,
    ),
  ).toBe(false);

  const half = Math.floor(simulation.result.firstPayment / 2);
  const endpoint = base + `/repayments/${id}/payments/1/record`;
  const requestId = randomUUID();
  const record = { amount: half, requestId, confirmed: true };
  expect((await context.request.put(endpoint, { data: record })).ok()).toBe(true);
  expect((await context.request.put(endpoint, { data: record })).ok()).toBe(true);
  expect(
    (await context.request.put(endpoint, { data: { ...record, amount: half + 1 } })).status(),
  ).toBe(409);
  expect(
    (
      await context.request.put(base + `/repayments/${id}/payments/2/record`, { data: record })
    ).status(),
  ).toBe(409);
  const ledger = await (await context.request.get(base + '/repayments')).json();
  expect(ledger.loans[0].schedule[0]).toMatchObject({
    paid: false,
    recordedAmount: half,
    remainingAmount: simulation.result.firstPayment - half,
  });
  expect(ledger.overdue[0].payment).toBe(simulation.result.firstPayment - half);
  expect(
    (await request.put(endpoint, { data: { ...record, requestId: randomUUID() } })).status(),
  ).toBe(404);
  expect(
    (
      await context.request.put(endpoint, {
        data: { amount: 0, requestId: randomUUID(), confirmed: true },
      })
    ).ok(),
  ).toBe(true);
  const history = await (
    await context.request.get(base + `/repayments/${id}/payments/1/history`)
  ).json();
  expect(history).toHaveLength(2);
  expect(
    history.map((item: { previousAmount: string; newAmount: string }) => [
      Number(item.previousAmount),
      Number(item.newAmount),
    ]),
  ).toEqual([
    [0, half],
    [half, 0],
  ]);
  expect((await request.get(base + `/repayments/${id}/payments/1/history`)).status()).toBe(404);

  const prefs = await (await context.request.get(base + '/notifications/preferences')).json();
  expect(prefs.emailEnabled).toBe(false);
  expect(
    (
      await context.request.put(base + '/notifications/preferences', {
        data: {
          ...prefs,
          remindersEnabled: false,
        },
      })
    ).ok(),
  ).toBe(true);
  expect((await (await context.request.get(base + '/notifications')).json()).items.length).toBe(
    notices.items.length,
  );
  const firstId = notices.items[0].id;
  expect((await request.put(base + `/notifications/${firstId}/read`)).status()).toBe(404);
  expect((await context.request.put(base + `/notifications/${firstId}/read`)).ok()).toBe(true);
});

test('preparation screen requests missing facts and uses the existing cashflow projection', async ({
  context,
  page,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Preparation synthetic',
        email: `prepare-${randomUUID()}@example.test`,
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  const today = (await (await context.request.get(base + '/repayments')).json()).today as string;
  const saved = await context.request.post(base + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 12_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: shift(today, 3),
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const simulation = await saved.json();
  const tracked = await context.request.post(base + '/repayments', {
    data: {
      simulationId: simulation.id,
      title: 'Prepare QA',
      confirmed: true,
    },
  });
  expect(tracked.ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/repayments');
  await page.getByRole('button', { name: 'Chuẩn bị kỳ trả' }).click();
  await expect(page).toHaveURL(/\/prepare\//);
  await expect(page.getByRole('tab', { name: 'Khoản vay' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Tính và lưu giả định' }).click();
  await expect(page.getByText('Cần bổ sung thông tin')).toBeVisible();
  await page.getByLabel('Tiền hiện có (VND)').fill('0');
  await page.getByLabel('Thu nhập tháng (VND)').fill('0');
  await page.getByLabel('Ngày nhận thu nhập (1–31)').fill('1');
  await page.getByLabel('Chi phí tháng (VND)').fill('0');
  await page.getByLabel('Ngày chi dự kiến (1–31)').fill('1');
  await page.getByLabel('Quỹ cần giữ lại (VND)').fill('0');
  await page.getByRole('button', { name: 'Tính và lưu giả định' }).click();
  await expect(page.getByText(/Cần chuẩn bị thêm/)).toBeVisible();
  await page.screenshot({ path: info.outputPath('preparation-mobile.png'), fullPage: true });
  const ledger = await (await context.request.get(base + '/repayments')).json();
  const result = await context.request.put(
    base + `/repayments/${ledger.loans[0].id}/preparation/1`,
    {
      data: {
        availableFunds: 0,
        incomeAmount: 0,
        incomeDay: 1,
        expensesAmount: 0,
        expensesDay: 1,
        reserve: 0,
        plannedExpenses: [],
        confirmed: true,
      },
    },
  );
  expect(result.ok()).toBe(true);
  expect((await result.json()).result.additionalNeeded).toBe(simulation.result.firstPayment);
  const reserveCheck = await context.request.put(
    base + `/repayments/${ledger.loans[0].id}/preparation/1`,
    {
      data: {
        availableFunds: simulation.result.firstPayment + 1,
        incomeAmount: 0,
        incomeDay: 1,
        expensesAmount: 0,
        expensesDay: 1,
        reserve: 2,
        plannedExpenses: [],
        confirmed: true,
      },
    },
  );
  expect(reserveCheck.ok()).toBe(true);
  expect((await reserveCheck.json()).result.additionalNeeded).toBe(1);
  const center = await (await context.request.get(base + '/notifications')).json();
  expect(center.items.some((item: { kind: string }) => item.kind === 'low_reserve')).toBe(true);
});

test('verified opt-in sends a generic reminder through Mailpit', async ({
  context,
  page,
  request,
}) => {
  test.skip(
    process.env.FINORA_REMINDER_EMAIL_ENABLED !== 'true',
    'Requires locally enabled SMTP reminders',
  );
  const email = `reminder-${randomUUID()}@example.test`;
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Reminder synthetic',
        email,
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Xác minh email này' }).click();
  await expect
    .poll(
      async () =>
        (await mailMessages(request, email))
          .find((message) => /\b\d{6}\b/.test(message.Text))
          ?.Text.match(/\b\d{6}\b/)?.[0],
    )
    .toMatch(/^\d{6}$/);
  const code = (await mailMessages(request, email))
    .find((message) => /\b\d{6}\b/.test(message.Text))
    ?.Text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error('Verification code did not arrive');
  await page.getByLabel('Mã xác minh 6 số').fill(code);
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page.getByText('Email đã xác minh', { exact: true })).toBeVisible();
  const capabilities = await (
    await context.request.get(base + '/notifications/capabilities')
  ).json();
  expect(capabilities.email, 'API server must run with FINORA_REMINDER_EMAIL_ENABLED=true').toBe(
    true,
  );
  const today = (await (await context.request.get(base + '/repayments')).json()).today as string;
  const saved = await context.request.post(base + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 12_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: shift(today, -1),
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const simulation = await saved.json();
  expect(
    (
      await context.request.post(base + '/repayments', {
        data: {
          simulationId: simulation.id,
          title: 'Private amount 12000000',
          confirmed: true,
        },
      })
    ).ok(),
  ).toBe(true);
  const second = await context.request.post(base + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 8_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: today,
      },
    },
  });
  expect(second.ok()).toBe(true);
  expect(
    (
      await context.request.post(base + '/repayments', {
        data: {
          simulationId: (await second.json()).id,
          title: 'Second private obligation',
          confirmed: true,
        },
      })
    ).ok(),
  ).toBe(true);
  expect((await context.request.get(base + '/notifications')).ok()).toBe(true);
  const prefs = await (await context.request.get(base + '/notifications/preferences')).json();
  expect(
    (
      await context.request.put(base + '/notifications/preferences', {
        data: { ...prefs, emailEnabled: true },
      })
    ).ok(),
  ).toBe(true);
  expect((await context.request.get(base + '/notifications')).ok()).toBe(true);
  await expect
    .poll(
      async () =>
        (await mailMessages(request, email)).filter((message) =>
          message.Subject.includes('repayment reminders'),
        ).length,
    )
    .toBe(1);
  const reminders = (await mailMessages(request, email)).filter((message) =>
    message.Subject.includes('repayment reminders'),
  );
  expect(reminders).toHaveLength(1);
  expect(reminders[0].Text).not.toMatch(/12000000|Private amount|Synthetic obligation/);
  const center = await (await context.request.get(base + '/notifications')).json();
  expect(center.items.some((item: { kind: string }) => item.kind === 'overdue')).toBe(true);
  expect(
    center.items.filter((item: { emailStatus: string }) => item.emailStatus === 'sent'),
  ).toHaveLength(1);
});
