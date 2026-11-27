import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

test('published shortlist survives search and explains why a cost ranking is unavailable', async ({
  page,
  context,
}) => {
  const account = await createLegacyAccount(context.request, {
    name: 'Marketplace QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(account.ok()).toBeTruthy();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/explore');
  const search = page.getByLabel('Tìm sản phẩm hoặc tổ chức');
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiền mặt online' }).click();
  await search.fill('shinhan tieu dung');
  await expect(page.getByRole('heading', { name: 'Vay tiền mặt online', exact: true })).toHaveCount(
    0,
  );
  const removeFirst = page.getByRole('button', { name: 'Bỏ khỏi so sánh: Vay tiền mặt online' });
  await expect(removeFirst).toBeVisible();
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiêu dùng', exact: true }).click();
  const compare = page.getByRole('button', { name: 'So sánh điều kiện', exact: true });
  await compare.click();
  await expect(page.getByText('Thiếu phí của ít nhất một sản phẩm.')).toBeVisible();
  await expect(
    page.getByText('Kỳ công bố hoặc cơ sở tính lãi không giống nhau hay chưa được công bố.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Mở nguồn chính thức: Home Credit/ }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await removeFirst.click();
  await expect(compare).toHaveCount(0);
  await expect(
    page.getByRole('checkbox', { name: 'Chọn so sánh: Vay tiêu dùng', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Nhập điều khoản của tôi', exact: true }).click();
  await expect(page).toHaveURL(/\/simulate\/custom$/);
});
