import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('Fin owns a single toolbar, opens peer tabs, and keeps the unsent prompt', async ({
  page,
  context,
}, info) => {
  const connected = await createLegacyAccount(context.request, {
    name: 'Fin Navigation QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(connected.ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/home');
  const fin = page.getByRole('tab', { name: 'Finora AI', exact: true });
  await fin.click();
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quay lại', exact: true })).toHaveCount(0);
  await expect(page.getByText('Cục bộ · mặc định')).toHaveCount(0);
  const bar = page.getByTestId('fin-composer');
  await expect(bar).toHaveCount(1);
  const tabs = bar.getByRole('button', { name: 'Các tab', exact: true });
  const input = bar.getByRole('textbox');
  const tools = bar.getByRole('button', { name: 'Nguồn và công cụ' });
  const picker = page.getByTestId('fin-tab-picker');
  await expect(tools).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', 'Hỏi Fin…');
  await page.screenshot({ path: info.outputPath('fin-single-toolbar.png') });

  await input.fill('Bản nháp mua xe, chưa gửi');
  await tabs.click();
  await expect(tabs).toHaveAttribute('aria-expanded', 'true');
  for (const name of ['Tổng quan', 'Khám phá', 'Khoản vay', 'Hồ sơ']) {
    await expect(picker.getByRole('button', { name, exact: true })).toBeVisible();
  }
  const popupBox = await picker.boundingBox();
  const barBox = await bar.boundingBox();
  expect(popupBox!.y + popupBox!.height).toBeLessThanOrEqual(barBox!.y);
  await page.screenshot({ path: info.outputPath('fin-tabs-popover.png') });
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await input.focus();
  await page.setViewportSize({ width: 390, height: 550 });
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await expect(bar.getByRole('button', { name: 'Gửi', exact: true })).toBeVisible();
  await tabs.click();
  await picker.getByRole('button', { name: 'Hồ sơ', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await fin.click();
  await expect(input).toHaveValue('Bản nháp mua xe, chưa gửi');
});
