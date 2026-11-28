import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('live six-turn Vietnamese consultation retains its private financial context', async ({
  context,
  page,
}) => {
  test.skip(process.env.FINORA_LIVE_AI_TEST !== '1', 'Requires explicit synthetic live AI test');
  config({ path: 'apps/api/.env', quiet: true });
  const { db } = await import('../../apps/api/src/infrastructure/db');
  const account = await createLegacyAccount(context.request, {
    name: 'Synthetic six-turn live QA',
    email: `${randomUUID()}@example.test`,
    password: randomUUID(),
  });
  expect(account.ok(), await account.text()).toBe(true);
  const prompts = [
    'Tôi muốn vay 20 triệu để sửa xe.',
    'Thu nhập của tôi là 12 triệu mỗi tháng.',
    'Chi phí sinh hoạt khoảng 7 triệu, đang trả một khoản nợ khác 500 nghìn mỗi tháng.',
    'Tôi muốn vay trong 12 tháng và trả tối đa 2 triệu mỗi tháng.',
    'Tôi có 10 triệu tiết kiệm và muốn giữ lại ít nhất 5 triệu làm quỹ dự phòng.',
    'Hãy tổng hợp hồ sơ tài chính và phân tích khả năng chi trả của tôi.',
  ];
  const expected = [
    { principal: 20_000_000, purpose: 'vehicle' },
    { principal: 20_000_000, purpose: 'vehicle', income: 12_000_000 },
    {
      principal: 20_000_000,
      purpose: 'vehicle',
      income: 12_000_000,
      expenses: 7_000_000,
      debt: 500_000,
    },
    {
      principal: 20_000_000,
      purpose: 'vehicle',
      income: 12_000_000,
      expenses: 7_000_000,
      debt: 500_000,
      months: 12,
      preferredPayment: 2_000_000,
    },
    {
      principal: 20_000_000,
      purpose: 'vehicle',
      income: 12_000_000,
      expenses: 7_000_000,
      debt: 500_000,
      months: 12,
      preferredPayment: 2_000_000,
      currentSavings: 10_000_000,
      minimumReserve: 5_000_000,
    },
  ];
  expected.push({ ...expected[4] });
  const providerModes: string[] = [];
  let ownerId: string | undefined;
  for (const [index, prompt] of prompts.entries()) {
    const requestId = randomUUID();
    const response = await context.request.post('http://localhost:3000/api/intelligence/stream', {
      data: { requestId, prompt, locale: 'vi-VN', externalConsent: true },
      timeout: 90_000,
    });
    expect(response.ok(), `turn ${index + 1}: ${response.status()}`).toBe(true);
    const events = (await response.text())
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map(
        (line) =>
          JSON.parse(line.slice(6)) as {
            type: string;
            provider?: string;
            blocks?: { kind: string; [key: string]: unknown }[];
          },
      );
    expect(events.at(-1)?.type).toBe('done');
    expect(events.some(({ type }) => type === 'progress')).toBe(true);
    expect(events.some(({ type }) => type === 'delta')).toBe(true);
    const provider = events.find(({ type }) => type === 'meta')?.provider ?? 'missing';
    providerModes.push(provider);
    const row = await db.intelligenceTurn.findFirst({ where: { requestId } });
    expect(row).not.toBeNull();
    expect(row?.provider).toBe(provider);
    if (ownerId) expect(row?.userId).toBe(ownerId);
    ownerId = row?.userId;
    const envelope = row?.blocks as { version: number; context?: Record<string, unknown> };
    expect(envelope.version).toBe(2);
    expect(envelope.context).toMatchObject(expected[index]!);
    const blocks = events.find(({ type }) => type === 'structured')?.blocks ?? [];
    expect(blocks.some(({ kind }) => kind === 'offers')).toBe(false);
    expect(blocks.some(({ kind }) => kind === 'matches')).toBe(false);
    expect(blocks.some(({ kind }) => kind === 'repayment_monitor')).toBe(false);
    if (index >= 2) {
      expect(blocks.find(({ kind }) => kind === 'affordability')).toMatchObject({
        income: 12_000_000,
        expenses: 7_000_000,
        debt: 500_000,
        cashFlow: 4_500_000,
      });
    }
    console.info('LIVE_VERIFY_TURN', {
      turn: index + 1,
      provider,
      contextFields: Object.keys(envelope.context ?? {}),
      blockKinds: blocks.map(({ kind }) => kind),
    });
  }
  expect(providerModes).toEqual(Array(6).fill('anthropic'));
  const history = await context.request.get('http://localhost:3000/api/intelligence/history');
  expect(history.ok()).toBe(true);
  expect((await history.json()).length).toBe(6);
  const assumptionId = randomUUID();
  const assumption = await context.request.post('http://localhost:3000/api/intelligence/stream', {
    data: {
      requestId: assumptionId,
      prompt: 'Giả sử trả thêm 2 triệu mỗi tháng thì còn bao nhiêu?',
      locale: 'vi-VN',
      externalConsent: false,
    },
  });
  expect(assumption.ok()).toBe(true);
  const assumed = await db.intelligenceTurn.findFirst({ where: { requestId: assumptionId } });
  const assumedNotices = (
    assumed?.blocks as { blocks: { kind: string; message?: string }[] }
  ).blocks
    .filter(({ kind }) => kind === 'notice')
    .map(({ message }) => message)
    .join(' ');
  expect(assumedNotices).toContain('2.500.000');
  expect(assumedNotices).toContain('20,83%');
  expect((assumed?.blocks as { context?: Record<string, unknown> }).context).toMatchObject({
    ...expected[4],
  });
  const updateId = randomUUID();
  const update = await context.request.post('http://localhost:3000/api/intelligence/stream', {
    data: {
      requestId: updateId,
      prompt: 'Thu nhập của tôi đổi thành 13 triệu mỗi tháng.',
      locale: 'vi-VN',
      externalConsent: false,
    },
  });
  expect(update.ok()).toBe(true);
  const updated = await db.intelligenceTurn.findFirst({ where: { requestId: updateId } });
  expect((updated?.blocks as { context?: Record<string, unknown> }).context).toMatchObject({
    ...expected[4],
    income: 13_000_000,
  });
  expect(await db.financialProfile.findUnique({ where: { userId: ownerId! } })).toBeNull();
  await page.goto('/assistant');
  await expect(page.getByText(prompts[5], { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByText(prompts[5], { exact: true })).toBeVisible();
  await expect(page.getByText('AI bên ngoài · Claude').last()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const uiPrompt = 'Giải thích tỷ lệ nợ trên thu nhập.';
  await page.getByRole('textbox', { name: 'Bạn đang cân nhắc khoản vay nào?' }).fill(uiPrompt);
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const uiTurn = page.getByText(uiPrompt, { exact: true });
  await expect(uiTurn).toBeVisible();
  await expect
    .poll(async () => {
      const box = await uiTurn.boundingBox();
      return Boolean(box && box.y >= 0 && box.y < 740);
    })
    .toBe(true);
  await db.$disconnect();
});

test('live backend emits SSE progress before the final model result and streams answer chunks', async ({
  context,
}) => {
  test.skip(process.env.FINORA_LIVE_AI_TEST !== '1', 'Requires explicit synthetic live AI test');
  const account = await createLegacyAccount(context.request, {
    name: 'Synthetic live SSE QA',
    email: `${randomUUID()}@example.test`,
    password: randomUUID(),
  });
  expect(account.ok(), await account.text()).toBe(true);
  const cookies = (await context.cookies('http://localhost:3000'))
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
  const started = performance.now();
  const response = await fetch('http://localhost:3000/api/intelligence/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
      Origin: 'http://localhost:8081',
    },
    body: JSON.stringify({
      requestId: randomUUID(),
      prompt: 'Please explain a synthetic loan term briefly.',
      locale: 'en-US',
      externalConsent: true,
    }),
  });
  expect(response.status).toBe(201);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const decoder = new TextDecoder();
  let body = '';
  let firstDataMs: number | null = null;
  let reads = 0;
  while (reader) {
    const next = await reader.read();
    if (next.done) break;
    reads++;
    body += decoder.decode(next.value, { stream: true });
    if (firstDataMs === null && body.includes('data: ')) firstDataMs = performance.now() - started;
  }
  const completedMs = performance.now() - started;
  const events = body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)) as { type: string; provider?: string });
  expect(events[0]?.type).toBe('progress');
  expect(events.find(({ type }) => type === 'meta')?.provider).toBe('anthropic');
  expect(events.filter(({ type }) => type === 'delta').length).toBeGreaterThan(1);
  expect(events.at(-1)?.type).toBe('done');
  expect(reads).toBeGreaterThan(1);
  expect(firstDataMs).not.toBeNull();
  expect(completedMs - firstDataMs!).toBeGreaterThan(100);
  console.info('LIVE_SSE_TIMING', {
    firstDataMs: Math.round(firstDataMs!),
    completedMs: Math.round(completedMs),
    reads,
    deltaEvents: events.filter(({ type }) => type === 'delta').length,
  });
});
