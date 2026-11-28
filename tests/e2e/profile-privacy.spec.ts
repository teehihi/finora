import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('profile privacy can delete one explicitly selected history without deleting the other or the profile', async ({
  context,
  page,
}) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Privacy QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  const api = 'http://localhost:3000/api/';
  const headers = { Origin: 'http://localhost:8081' };
  const owned = { income: 12_000_000, expenses: 5_000_000, debt: 1_000_000 };
  expect((await context.request.put(api + 'profile', { headers, data: owned })).ok()).toBe(true);
  const count = async (which: string) =>
    (await (await context.request.get(api + which + '/history')).json()).length;
  for (const which of ['assistant', 'intelligence']) {
    const r = await context.request.post(api + which + '/stream', {
      headers,
      data: { prompt: 'Tôi muốn hiểu tiền gốc và lãi.', locale: 'vi-VN', requestId: randomUUID() },
    });
    expect(r.ok(), await r.text()).toBe(true);
    await expect.poll(() => count(which)).toBe(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Quyền riêng tư', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/privacy$/);
  await page.getByRole('button', { name: 'Xóa lịch sử Finora AI' }).click();
  await expect(page.getByText(/Chỉ xóa lịch sử đã chọn/)).toBeVisible();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  expect(await count('intelligence')).toBe(1);
  await page.getByRole('button', { name: 'Xóa lịch sử Finora AI' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa lịch sử' }).click();
  await expect(page.getByText('Đã xóa lịch sử Finora AI.')).toBeVisible();
  expect(await count('intelligence')).toBe(0);
  expect(await count('assistant')).toBe(1);
  expect((await (await context.request.get(api + 'account')).json()).profile).toEqual(owned);
});
