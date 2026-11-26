import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('sample loan discovery keeps terms comparable and separates estimates from real obligations', async ({
  page,
  context,
}, info) => {
  const account = await createLegacyAccount(context.request, {
    name: 'Discovery QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(account.ok(), await account.text()).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore?mode=sample');
  await expect(page.getByText(/không phải báo giá/)).toBeVisible();
  const search = page.getByLabel('Tìm sản phẩm hoặc tổ chức');
  await search.fill('dong hanh hoc tap');
  const education = page.getByRole('checkbox', { name: 'Chọn so sánh: Đồng hành học tập' });
  await expect(education).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chi tiêu linh hoạt' })).toHaveCount(0);
  await education.click();
  await search.clear();
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Chi tiêu linh hoạt' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Chọn so sánh: Chăm chút tổ ấm' }),
  ).toBeDisabled();

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'So sánh điều kiện', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'So sánh điều kiện', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Chưa xác định', { exact: true })).toBeVisible();
    await expect(page.getByText(/Điều kiện áp dụng thực tế chưa được xác minh/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.FINORA_VISUAL_DISCOVERY === '1') {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('comparison-' + width + '.png'),
        animations: 'disabled',
      });
    }
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Bỏ chọn tất cả' }).click();
  await expect(page.getByRole('checkbox', { name: 'Chọn so sánh: Chăm chút tổ ấm' })).toBeEnabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await page.getByRole('radio', { name: '12%', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chăm chút tổ ấm' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chi tiêu linh hoạt' })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Khoản vay', exact: true }).click();
  await expect(page.getByText(/Các bản mô phỏng không tự trở thành khoản vay/)).toBeVisible();
  await page.getByRole('tab', { name: 'Bản mô phỏng', exact: true }).click();
  await expect(page.getByText('Chưa có bản mô phỏng', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem sản phẩm mẫu' })).toBeVisible();
});
