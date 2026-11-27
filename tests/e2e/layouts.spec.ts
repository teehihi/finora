import { createLegacyAccount } from './legacy-fixture';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('five destinations adapt at all widths and persist appearance and English', async ({
  page,
  context,
}) => {
  const created = await createLegacyAccount(context.request, {
    name: 'Layout QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(created.ok()).toBe(true);
  for (const [route, heading] of [
    ['home', /(?:Xin chào, Layout QA\.|Chào, QA)/],
    ['explore', 'Thư viện khoản vay'],
    ['assistant', 'Cùng Fin tính khoản vay'],
    ['loans', 'Khoản vay'],
    ['profile', 'Hồ sơ của bạn'],
  ]) {
    await page.goto('/' + route);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    for (const width of [360, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const composerNav = route === 'assistant' && width < 768;
      const tab = composerNav
        ? page.getByRole('button', { name: 'Các tab', exact: true })
        : page.getByRole('tab', { name: 'Khám phá' });
      if (!composerNav) await expect(page.getByRole('tab', { name: 'Finora AI' })).toBeVisible();
      await expect
        .poll(
          async () => {
            const box = await tab.boundingBox();
            return Boolean(
              box && box.height >= 44 && (width < 768 ? box.y > 650 : box.x < 240 && box.y < 650),
            );
          },
          { message: route + ' navigation at ' + width },
        )
        .toBe(true);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
          message: route + ' overflow at ' + width,
        })
        .toBeLessThanOrEqual(0);
    }
  }
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Clear Finora AI history', exact: true }).click();
  await expect(
    page.getByText(/Only the selected history for this account is removed/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
