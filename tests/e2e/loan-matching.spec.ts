import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const api = 'http://localhost:3000';

test('personal matching stays deterministic, private, and honest about incomplete public terms', async ({
  page,
  request,
}, info) => {
  const body = { amount: 30_000_000, months: 24, category: 'personal' };
  expect(
    (await request.post(api + '/api/intelligence/catalog/matches', { data: body })).status(),
  ).toBe(401);
  const signedUp = await createLegacyAccount(page.request, {
    name: 'Synthetic matching QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(signedUp.ok(), await signedUp.text()).toBe(true);
  const saved = await page.request.put(api + '/api/profile', {
    data: { income: 20_000_000, expenses: 7_000_000, debt: 1_000_000 },
  });
  expect(saved.ok(), await saved.text()).toBe(true);
  const a = await page.request.post(api + '/api/intelligence/catalog/matches', { data: body });
  const b = await page.request.post(api + '/api/intelligence/catalog/matches', { data: body });
  expect(a.ok(), await a.text()).toBe(true);
  expect(b.ok(), await b.text()).toBe(true);
  const first = (await a.json()) as {
    outcome: string;
    suitableIds: string[];
    ranked: {
      productId: string;
      suitability: string;
      repayment: unknown;
      reasons: string[];
      classification: string;
    }[];
  };
  expect(first).toEqual(await b.json());
  expect(first.outcome).toBe('no_suitable_loan');
  expect(first.suitableIds).toEqual([]);
  expect(first.ranked).toHaveLength(6);
  expect(
    first.ranked.every(
      (entry) => entry.suitability !== 'suitable' && entry.classification === 'incomplete',
    ),
  ).toBe(true);
  expect(
    first.ranked.find((entry) => entry.productId === 'home-credit-online-cash')?.reasons,
  ).toContain('method_unknown');
  expect(
    first.ranked.find((entry) => entry.productId === 'vpbank-salary-consumer')?.repayment,
  ).toBeNull();
  expect(
    (
      await page.request.post(api + '/api/intelligence/catalog/matches', {
        data: { ...body, amount: -1 },
      })
    ).status(),
  ).toBe(400);

  const turn = await page.request.post(api + '/api/intelligence/stream', {
    data: {
      requestId: randomUUID(),
      prompt: 'Gợi ý khoản vay 30 triệu tiêu dùng trả trong 24 tháng',
      locale: 'vi-VN',
      externalConsent: false,
    },
  });
  expect(turn.ok(), await turn.text()).toBe(true);
  const events = (await turn.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map(
      (line) =>
        JSON.parse(line.slice(6)) as {
          type: string;
          blocks?: { kind: string; result?: { outcome: string; ranked: unknown[] } }[];
        },
    );
  const matching = events
    .find((event) => event.type === 'structured')
    ?.blocks?.find((block) => block.kind === 'matches')?.result;
  expect(matching?.outcome).toBe('no_suitable_loan');
  expect(matching?.ranked).toHaveLength(6);
  expect(matching?.ranked).toEqual(first.ranked);

  await page.goto('/explore');
  await page.getByRole('button', { name: 'Bộ lọc' }).click();
  await page.getByLabel('Số tiền').fill('30000000');
  await page.getByLabel('Kỳ hạn (tháng)').fill('24');
  await page.getByRole('button', { name: 'Hoàn tất' }).click();
  await expect(page.getByText(/Chưa có khoản vay đủ điều kiện để xác nhận phù hợp/)).toBeVisible();
  await expect(page.getByText('Gợi ý theo tình hình tài chính')).toBeVisible();
  if (process.env.FINORA_VISUAL_MATCHING === '1') {
    await page.screenshot({ path: info.outputPath('matching-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByText(/Chưa có khoản vay đủ điều kiện để xác nhận phù hợp/),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('matching-phone.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiền mặt online' }).click();
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiêu dùng' }).click();
  await page.getByRole('button', { name: 'So sánh điều kiện', exact: true }).click();
  await expect(page.getByText('Gợi ý theo tình hình tài chính').last()).toBeVisible();
  if (process.env.FINORA_VISUAL_MATCHING === '1')
    await page.screenshot({ path: info.outputPath('matching-compare.png'), fullPage: true });
  if (process.env.FINORA_VISUAL_MATCHING === '1') {
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    const preference = await page.request.put(api + '/api/preferences', {
      data: { locale: 'vi-VN', appearance: 'dark' },
    });
    expect(preference.ok(), await preference.text()).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Bộ lọc' }).click();
    await page.getByLabel('Số tiền').fill('30000000');
    await page.getByLabel('Kỳ hạn (tháng)').fill('24');
    await page.getByRole('button', { name: 'Hoàn tất' }).click();
    await expect(
      page.getByText(/Chưa có khoản vay đủ điều kiện để xác nhận phù hợp/),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('matching-dark.png'), fullPage: true });
  }
});
