import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('an unresponsive API read becomes retryable without blocking phone navigation', async ({
  page,
  context,
}) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Finora Network QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();

  let held = true;
  let attempts = 0;
  let release: () => void = () => undefined;
  const delay = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/repayments', async (route) => {
    if (route.request().method() === 'GET') attempts += 1;
    if (held) await delay;
    await route.continue().catch(() => undefined);
  });

  try {
    await page.goto('/home');
    await expect(page.getByTestId('task-hero-skeleton')).toBeVisible();
    await expect.poll(() => attempts).toBe(1);
    await expect(page.getByRole('tab', { name: 'Khám phá', exact: true })).toBeEnabled();
    await page.clock.fastForward(4_000);
    await expect(page.getByText(/Kết nối chậm hơn thường lệ/).first()).toBeVisible();
    await expect(page.getByTestId('task-hero-skeleton')).toBeVisible();
    await page.clock.fastForward(11_100);
    const retry = page.getByRole('button', { name: 'Thử lại', exact: true }).first();
    await expect(retry).toBeVisible();
    await expect(page.getByTestId('task-hero-skeleton')).toHaveCount(0);
    expect(attempts).toBe(1);

    held = false;
    release();
    await retry.click();
    await expect.poll(() => attempts).toBe(2);
    await expect(retry).toHaveCount(0);
    await page.getByRole('tab', { name: 'Khám phá', exact: true }).click();
    await expect(page).toHaveURL(/\/explore$/);
  } finally {
    held = false;
    release();
  }
});
