import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('brand launch is visible only while the session is pending', async ({
  page,
  context,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Finora Launch QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/get-session', async (route) => {
    await pending;
    await route.continue().catch(() => undefined);
  });
  try {
    await page.goto('/');
    const splash = page.getByTestId('finora-launch');
    await expect(splash).toBeVisible();
    await expect(splash).toHaveAttribute('role', 'progressbar');
    await page.screenshot({ path: info.outputPath('01-launch-390.png') });
    release();
    await expect(page).toHaveURL(/\/home$/);
    await expect(splash).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Tổng quan', exact: true })).toBeVisible();
  } finally {
    release();
  }
});
