import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const api = 'http://localhost:3000/api';

test('mobile roots use their own titles without a repeated logo bar or blocked payment action', async ({
  page,
  context,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Finora Visual QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home');
  await expect(page.getByRole('tab', { name: 'Tổng quan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finora', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xem kỳ trả', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('home-empty-390.png') });

  const ledgerResponse = await context.request.get(api + '/repayments');
  expect(ledgerResponse.ok()).toBe(true);
  const { today } = await ledgerResponse.json();
  const saved = await context.request.post(api + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 12_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: today,
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const { id: simulationId } = await saved.json();
  const title = 'Khoản vay minh họa QA';
  expect(
    (
      await context.request.post(api + '/repayments', {
        data: { simulationId, title, confirmed: true },
      })
    ).ok(),
  ).toBe(true);

  await page.reload();
  const primary = page.getByRole('button', { name: 'Xem kỳ trả', exact: true });
  await expect(primary).toBeInViewport();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  const dock = page
    .getByRole('tablist')
    .filter({ has: page.getByRole('tab', { name: 'Tổng quan', exact: true }) });
  const action = await primary.boundingBox();
  expect(action && action.y + action.height).toBeLessThan((await dock.boundingBox())!.y);
  await page.screenshot({ path: info.outputPath('home-due-390.png') });

  for (const [url, heading, filename] of [
    ['/explore', 'Thư viện khoản vay', 'explore-390.png'],
    ['/assistant', 'Cùng Fin tính khoản vay', 'ai-390.png'],
    ['/loans', 'Khoản vay', 'loans-390.png'],
    ['/profile', 'Hồ sơ của bạn', 'profile-390.png'],
  ] as const) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finora', exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(filename) });
  }
  const dark = page.getByRole('radio', { name: 'Tối', exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/home');
  await expect(primary).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: info.outputPath('home-due-dark-320.png') });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/home');
  await expect(page.getByRole('button', { name: 'Finora', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tổng quan', exact: true })).toBeVisible();
});
