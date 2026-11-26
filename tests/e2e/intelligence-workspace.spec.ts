import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://localhost:3000';
const origin = 'http://localhost:8081';

test('analyze verified assumptions, explicitly save, and revisit the repayment schedule', async ({
  page,
  context,
}, info) => {
  const headers = { Origin: origin };
  expect((await context.request.get(api + '/api/intelligence/history')).status()).toBe(401);
  const session = await createLegacyAccount(context.request, {
    name: 'Intelligence QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(session.ok(), await session.text()).toBe(true);
  const profile = await context.request.put(api + '/api/profile', {
    headers,
    data: { income: 15_000_000, expenses: 6_000_000, debt: 2_000_000 },
  });
  expect(profile.ok()).toBe(true);
  const captures = process.env.FINORA_VISUAL_INTELLIGENCE === '1';

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Mở bàn phân tích', exact: true }).click();
  await expect(page).toHaveURL(/\/intelligence$/);
  await expect(page.getByRole('tab', { name: 'Finora AI' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Bàn phân tích khoản vay' })).toBeVisible();
  await expect(page.getByText('Mặc định: mô phỏng cục bộ')).toBeVisible();
  if (captures) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('intelligence-empty-' + width + '.png'),
        animations: 'disabled',
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }

  const question = 'Tôi muốn vay 50 triệu trong 24 và 36 tháng, lãi suất 12% năm, trả góp đều';
  await page.goto('/intelligence?draftPrompt=' + encodeURIComponent(question));
  const composer = page.getByLabel('Bạn đang cân nhắc khoản vay nào?');
  await expect(composer).toHaveValue(question);
  expect(await (await context.request.get(api + '/api/intelligence/history')).json()).toEqual([]);
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const affordability = page.getByRole('heading', { name: 'Khả năng trả nợ ước tính' });
  await expect(affordability).toBeVisible();
  await expect(page.getByText('13,33%', { exact: true })).toBeVisible();
  const scenario = page.getByRole('heading', { name: 'Kịch bản trả nợ · 24 tháng' });
  await expect(scenario).toBeVisible();
  const alternative = page.getByRole('heading', { name: 'Kịch bản trả nợ · 36 tháng' });
  await expect(alternative).toBeVisible();
  await expect(page.getByText('Mô phỏng cục bộ', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu mô phỏng này' }).first()).toBeVisible();

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect
      .poll(async () => {
        const [left, right] = await Promise.all([
          scenario.boundingBox(),
          alternative.boundingBox(),
        ]);
        if (!left || !right) return false;
        return width === 1440
          ? left.x < right.x && Math.abs(left.y - right.y) < 4
          : Math.abs(left.x - right.x) < 4 && left.y < right.y;
      })
      .toBe(true);
    if (captures) {
      await scenario.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('intelligence-scenario-' + width + '.png'),
        animations: 'disabled',
      });
    }
  }
  await page.reload();
  const save = page.getByRole('button', { name: 'Lưu mô phỏng này' }).first();
  await expect(save).toBeVisible();
  await save.click();
  await expect(
    page.getByText('Lưu các giả định và lịch trả nợ để xem lại.', { exact: false }),
  ).toBeVisible();
  expect(await (await context.request.get(api + '/api/simulations')).json()).toEqual([]);
  await page.getByRole('button', { name: 'Xác nhận lưu mô phỏng' }).click();
  await expect(page).toHaveURL(/\/saved\/[a-f0-9-]+$/i);
  await expect(page.getByText('Lịch trả nợ', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Phân tích mô phỏng này' }).click();
  await expect(page).toHaveURL(/\/intelligence\?simulationId=[a-f0-9-]+$/i);
  await expect(page.getByRole('button', { name: 'Bỏ tham chiếu' })).toBeVisible();
});
