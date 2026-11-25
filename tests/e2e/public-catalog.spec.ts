import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://localhost:3000';

test('reviewed loan terms and sample planning remain separate', async ({ page, context }, info) => {
  const url = api + '/api/intelligence/catalog';
  expect((await context.request.get(url)).status()).toBe(401);
  const session = await createLegacyAccount(context.request, {
    name: 'Catalog QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(session.ok(), await session.text()).toBeTruthy();
  const filtered = await context.request.get(url + '?category=auto&amount=50000000&months=24');
  expect(filtered.ok()).toBe(true);
  expect(await filtered.json()).toEqual([
    expect.objectContaining({
      id: 'shinhan-new-car',
      amountMax: null,
      provenance: 'official_public',
    }),
  ]);
  expect((await context.request.get(url + '?amount=invalid')).status()).toBe(400);
  expect((await context.request.get(url + '/unknown-id')).status()).toBe(404);
  expect((await context.request.get(url + '/home-credit-online-cash')).ok()).toBe(true);

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/explore');
    const disclosure = page.getByText(/không phải báo giá cá nhân/);
    await expect(disclosure).toBeVisible();
    const search = page.getByLabel('Tìm sản phẩm hoặc tổ chức');
    await search.fill('home credit');
    await expect(page.getByRole('heading', { name: 'Vay tiền mặt online' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vay tín chấp theo lương' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Xem nguồn và điều kiện: Vay tiền mặt online' }).click();
    await expect(
      page.getByText('Công bố từ 0,75% mỗi tháng', { exact: true }).last(),
    ).toBeVisible();
    await expect(page.getByText('Tổng phí một lần', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Mở nguồn chính thức: Home Credit/ }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await search.clear();
    await page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiền mặt online' }).click();
    await page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiêu dùng' }).click();
    await page.getByRole('button', { name: 'So sánh điều kiện', exact: true }).click();
    await expect(page.getByText(/Chỉ đối chiếu điều kiện, không xếp hạng chi phí/)).toBeVisible();
    await expect(page.getByText('Công bố từ 12,5% mỗi năm', { exact: true }).last()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.FINORA_VISUAL_DISCOVERY === '1') {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('public-compare-' + width + '.png'),
        animations: 'disabled',
      });
    }
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  }
  await page.getByRole('radio', { name: 'Bản mô phỏng mẫu', exact: true }).click();
  await expect(page.getByText(/không phải báo giá từ tổ chức cho vay/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chi tiêu linh hoạt' })).toBeVisible();
});
