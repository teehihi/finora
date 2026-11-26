import { createLegacyAccount } from './legacy-fixture';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://localhost:3000';

test('simulator compares actual calculated scenarios, preserves unknown fees and shows the ledger', async ({
  page,
  context,
}) => {
  const session = await createLegacyAccount(context.request, {
    name: 'Mô phỏng QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(session.ok()).toBe(true);
  const catalog = await context.request.get(api + '/api/catalog');
  expect(catalog.ok()).toBe(true);
  const product = (await catalog.json()).find(
    (offer: { name: string }) => offer.name === 'Chi tiêu linh hoạt',
  );
  expect(product).toBeTruthy();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/simulate/' + product.id);
    await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
    const result = page.getByRole('heading', { name: 'Chi tiết trả nợ' });
    await expect(result).toBeVisible();
    await expect(page.getByText('Phí chưa xác định.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Giữ làm mốc so sánh' }).click();
    await expect(page.getByRole('heading', { name: 'Mốc so sánh' })).toBeVisible();
    await page.getByLabel('Số tiền vay', { exact: true }).fill(String(product.amountMin));
    await expect(result).toHaveCount(0);
    await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
    await expect(page.getByText('Chênh lệch kỳ đầu', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Xem thêm' }).click();
    await expect(page.getByText(/Kỳ 7 ·/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Bỏ mốc' }).click();
    await expect(page.getByRole('heading', { name: 'Mốc so sánh' })).toHaveCount(0);
  }
});
