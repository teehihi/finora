import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('Fin retains ordinary Vietnamese budget facts without premature catalog cards', async ({
  context,
  page,
}, info) => {
  const created = await createLegacyAccount(context.request, {
    name: 'Synthetic conversation QA',
    email: `${randomUUID()}@example.test`,
    password: randomUUID(),
  });
  expect(created.ok(), await created.text()).toBe(true);
  const prompts = [
    'Tôi muốn vay 20 triệu để sửa xe.',
    'Thu nhập của tôi là 12 triệu mỗi tháng.',
    'Chi phí sinh hoạt khoảng 7 triệu, đang trả một khoản nợ khác 500 nghìn mỗi tháng.',
    'Tôi muốn vay trong 12 tháng và trả tối đa 2 triệu mỗi tháng.',
    'Tôi có 10 triệu tiết kiệm và muốn giữ lại ít nhất 5 triệu làm quỹ dự phòng.',
    'Hãy tổng hợp hồ sơ tài chính và phân tích khả năng chi trả của tôi.',
  ];
  const turns = [] as {
    answer: string;
    blocks: { kind: string; fields?: string[]; [key: string]: unknown }[];
  }[];
  for (const prompt of prompts) {
    const response = await context.request.post('http://localhost:3000/api/intelligence/stream', {
      data: { requestId: randomUUID(), prompt, locale: 'vi-VN', externalConsent: false },
    });
    expect(response.ok(), await response.text()).toBe(true);
    const history = await (
      await context.request.get('http://localhost:3000/api/intelligence/history')
    ).json();
    turns.push(history.at(-1));
  }
  expect(turns[0].blocks.some((block) => block.kind === 'offers')).toBe(false);
  expect(turns[0].answer).toMatch(/20 triệu|20\.000\.000/u);
  expect(turns[1].answer).toMatch(/thu nhập/u);
  expect(
    turns[0].blocks.find((block) => block.kind === 'missing')?.fields?.length,
  ).toBeLessThanOrEqual(2);
  expect(turns[1].blocks.some((block) => block.kind === 'offers')).toBe(false);
  expect(
    turns.slice(0, 5).map((turn) => turn.blocks.find((block) => block.kind === 'missing')?.fields),
  ).toEqual([
    ['income', 'expenses'],
    ['expenses', 'debt'],
    ['months', 'preferredPayment'],
    ['currentSavings', 'minimumReserve'],
    ['incomeStability'],
  ]);
  expect(turns[5].blocks.some((block) => block.kind === 'missing')).toBe(false);
  expect(turns[2].blocks.find((block) => block.kind === 'affordability')).toMatchObject({
    income: 12_000_000,
    expenses: 7_000_000,
    debt: 500_000,
  });
  for (const turn of turns.slice(2)) {
    expect(turn.blocks.find((block) => block.kind === 'missing')?.fields ?? []).not.toEqual(
      expect.arrayContaining(['income', 'expenses', 'debt']),
    );
    expect(turn.blocks.some((block) => block.kind === 'offers')).toBe(false);
  }
  expect(turns.at(-1)?.answer).toMatch(/12|thu nhập|ngân sách/u);
  expect(turns.at(-1)?.answer).toContain('10.000.000');
  expect(turns.at(-1)?.answer).toContain('5.000.000');
  expect(turns.at(-1)?.answer).toContain('20.000.000');
  expect(turns.at(-1)?.answer).toContain('2.000.000');
  expect(turns.at(-1)?.answer).toContain('khoảng 7.000.000');
  expect(turns.at(-1)?.answer).not.toContain('Mình tách phần ngân sách, các lựa chọn công bố');
  await page.setViewportSize({ width: 1720, height: 1000 });
  await page.goto('/assistant');
  const bubble = page.getByText(prompts[2], { exact: true }).locator('..');
  await expect(bubble).toBeVisible();
  expect((await bubble.boundingBox())?.width).toBeLessThanOrEqual(640);
  const answerSurface = page.getByText(turns[5].answer, { exact: true }).locator('..');
  expect((await answerSurface.boundingBox())?.width).toBeLessThanOrEqual(760);
  await page.screenshot({
    path: info.outputPath('conversation-desktop.png'),
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({
    path: info.outputPath('conversation-mobile-web.png'),
    animations: 'disabled',
  });
  const dark = await context.request.put('http://localhost:3000/api/preferences', {
    data: { locale: 'vi-VN', appearance: 'dark' },
  });
  expect(dark.ok(), await dark.text()).toBe(true);
  await page.reload();
  await expect(page.getByText(turns[5].answer, { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({
    path: info.outputPath('conversation-mobile-dark-web.png'),
    animations: 'disabled',
  });
});
