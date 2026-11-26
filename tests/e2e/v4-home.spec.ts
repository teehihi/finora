import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

test('Home separates repayment capacity from cash remaining and exposes the featured AI tab', async ({
  context,
  page,
}) => {
  const owner = await createLegacyAccount(context.request, {
    email: randomUUID() + '@example.test',
    name: 'An',
    password: randomUUID(),
  });
  expect(owner.ok()).toBeTruthy();

  const profile = async (expenses: number) => {
    const res = await context.request.put('http://localhost:3000/api/profile', {
      headers: { Origin: 'http://localhost:8081' },
      data: { income: 15_000_000, expenses, debt: 1_000_000 },
    });
    expect(res.ok()).toBeTruthy();
    await page.goto('/home');
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await profile(8_000_000);
  await expect(page.getByRole('heading', { name: /4\.250\.000/ })).toBeVisible();
  await expect(page.getByText('6 triệu ₫', { exact: true })).toBeVisible();
  await expect(page.getByText('Còn lại trước khoản vay mới')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tổng quan' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const ai = page.getByRole('tab', { name: 'Finora AI', exact: true });
  await expect(ai).toHaveAttribute('aria-selected', 'false');
  await ai.click();
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(ai).toHaveAttribute('aria-selected', 'true');

  await profile(16_000_000);
  await expect(page.getByText('Thiếu trước khoản vay mới')).toBeVisible();
  await expect(page.getByText('2 triệu ₫', { exact: true })).toBeVisible();
  await expect(page.getByText('Còn lại trước khoản vay mới')).toHaveCount(0);

  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  }
});
