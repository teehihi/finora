import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

test('V4 published bounds can be adjusted and unknown limits stay qualified', async ({
  page,
  context,
}) => {
  const account = await createLegacyAccount(context.request, {
    name: 'V4 Market QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(account.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Vay tiền mặt online' })).toBeVisible();
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await page.getByRole('textbox', { name: 'Số tiền vay', exact: true }).fill('50000000');
  await page.getByRole('textbox', { name: 'Kỳ hạn (tháng)', exact: true }).fill('24');
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
  const search = page.getByLabel('Tìm sản phẩm hoặc tổ chức');
  await search.fill('shinhan mua o to');
  await expect(
    page.getByText('Cần xác nhận số tiền hoặc kỳ hạn với tổ chức cho vay.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await page.getByRole('textbox', { name: 'Kỳ hạn (tháng)', exact: true }).fill('360');
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
  await expect(page.getByText('Không có kết quả phù hợp')).toBeVisible();
});

test('V4 calculator controls drive an API-calculated live first payment', async ({
  page,
  context,
}) => {
  const account = await createLegacyAccount(context.request, {
    name: 'V4 Calculator QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(account.ok()).toBeTruthy();
  const response = await context.request.get('http://localhost:3000/api/catalog');
  expect(response.ok()).toBeTruthy();
  const offers: { id: string; name: string }[] = await response.json();
  const offer = offers.find((p) => p.name === 'Chi tiêu linh hoạt');
  expect(offer).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/simulate/' + offer!.id);
  const field = page.getByLabel('Số tiền vay', { exact: true });
  const original = Number(await field.inputValue());
  await page.getByRole('button', { name: 'Tăng số tiền vay' }).click();
  await expect.poll(async () => Number(await field.inputValue())).toBeGreaterThan(original);
  await expect(page.getByText('Ước tính kỳ đầu', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chi tiết trả nợ' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
  await expect(page.getByRole('heading', { name: 'Chi tiết trả nợ' })).toBeVisible();
});
