import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('phone tabs own their titles; detail screens keep one way back without the site masthead', async ({
  page,
  context,
}, info) => {
  const created = await createLegacyAccount(context.request, {
    name: 'Navigation QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(created.ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');
  const back = page.getByRole('button', { name: 'Quay lại', exact: true });
  const logo = page.getByRole('button', { name: 'Finora', exact: true });
  for (const [tab, title] of [
    ['Khám phá', 'Thư viện khoản vay'],
    ['Khoản vay', 'Khoản vay'],
    ['Hồ sơ', 'Hồ sơ của bạn'],
    ['Finora AI', 'Cùng Fin tính khoản vay'],
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const heading = page.getByRole('heading', { name: title, exact: true });
    await expect(heading).toBeVisible();
    await expect(logo).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hồ sơ', exact: true })).toHaveCount(0);
    await expect(back).toHaveCount(0);
    if (process.env.FINORA_VISUAL_NAVIGATION === '1') {
      await page.evaluate(async () => {
        // Capture the settled touch layout, not a Playwright click's focus outline.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        await document.fonts.ready;
      });
      await page.screenshot({ path: info.outputPath(tab + '-390.png'), animations: 'disabled' });
    }
  }
  await expect(page.getByLabel('Bạn đang cân nhắc khoản vay nào?')).toHaveAttribute(
    'placeholder',
    'Hỏi về khoản vay…',
  );
  // The former masthead is gone, but AI tools stay reachable from the composer.
  await page.getByRole('button', { name: 'Nguồn và công cụ' }).click();
  const tools = page.getByRole('dialog', { name: 'Nguồn và công cụ' });
  await tools.getByRole('button', { name: 'Đọc điều khoản trong tài liệu' }).click();
  await expect(page.getByRole('heading', { name: 'Đọc đề nghị vay', exact: true })).toBeVisible();
  await expect(back).toHaveCount(1);
  const target = await back.boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(44);
  expect(target!.height).toBeGreaterThanOrEqual(44);
  await back.press('Enter');
  await expect(page).toHaveURL(/\/assistant$/);

  await page.getByRole('tab', { name: 'Khám phá', exact: true }).click();
  await page.getByRole('button', { name: 'Nhập điều khoản của tôi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mô phỏng khoản vay của bạn' })).toBeVisible();
  await expect(back).toHaveCount(1);
  await back.click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(logo).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hồ sơ', exact: true })).toBeVisible();
  const linked = await context.newPage();
  await linked.setViewportSize({ width: 320, height: 700 });
  await linked.goto('/simulate/custom');
  await linked.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(linked).toHaveURL(/\/explore$/);
  await linked.close();
});
