import { createLegacyAccount } from './legacy-fixture';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('five destinations adapt at all widths and persist appearance and English', async ({
  page,
  context,
}, info) => {
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
      if (route === 'profile') {
        const cover = page.getByTestId('account-hub-cover');
        await expect(cover).toBeVisible();
        await expect
          .poll(() => cover.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
          .toBe(2172);
        if (width === 390 || width === 1440)
          await page.screenshot({ path: info.outputPath(`profile-cover-${width}-light.png`) });
      }
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
  await page.getByRole('button', { name: 'Tùy chọn sử dụng', exact: true }).click();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile');
  await expect(page.getByTestId('account-hub-cover')).toHaveCSS('opacity', '0.14');
  await expect(page.getByRole('heading', { name: 'Your profile', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('profile-cover-390-dark.png') });
  await page.goto('/profile/privacy');
  await expect(page.getByTestId('account-hub-cover')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear Finora AI history', exact: true }).click();
  await expect(
    page.getByText(/Only the selected history for this account is removed/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
