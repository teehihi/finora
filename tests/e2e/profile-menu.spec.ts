import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('profile menu preserves both screens and links real destinations', async ({
  context,
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Profile menu QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  await page.goto('/profile');
  const groups = page.getByTestId('account-hub-groups');
  const header = page.getByTestId('account-hub-hero');
  await expect(page.getByTestId('account-hub-cover')).toBeVisible();
  await expect(header.getByRole('button', { name: 'Lịch trả nợ', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Bản đồ dòng tiền', exact: true })).toBeVisible();
  const button = (name: string) => groups.getByRole('button', { name, exact: true });
  const back = () =>
    page.getByTestId('workspace-detail-chrome').getByRole('button', { name: 'Quay lại' });
  await expect(groups.getByRole('heading')).toHaveText(['Mục chính', 'Cài đặt', 'Hỗ trợ']);
  await expect(groups.getByText('Chưa hỗ trợ', { exact: true })).toHaveCount(4);
  await expect(button('Gửi phản hồi')).toHaveCount(0);
  await expect(page.getByText(/^Phiên bản \d/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('profile-menu-390.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });

  await header.getByRole('button', { name: 'Hồ sơ cá nhân', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/personal$/);
  await expect(page.getByTestId('personal-profile-identity')).toBeVisible();
  await back().click();
  await button('Thông tin và bảo mật').click();
  await expect(page).toHaveURL(/\/profile\/personal$/);
  await back().click();

  await button('Sức khỏe tài chính').click();
  await expect(page.getByText(/Thêm thông tin trong Hồ sơ tài chính/)).toBeVisible();
  const response = await context.request.put('http://localhost:3000/api/profile', {
    headers: { Origin: 'http://localhost:8081' },
    data: { income: 12000000, expenses: 5000000, debt: 2000000 },
  });
  expect(response.ok()).toBe(true);
  await page.reload();
  await expect(page.getByText('Tiền còn lại sau chi phí và nợ', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /5\.000\.000/ })).toBeVisible();
  await back().click();

  await button('Tài liệu của tôi').click();
  await expect(page).toHaveURL(/\/documents$/);
  await page.goBack();
  await button('Lịch sử mô phỏng').click();
  await expect(page).toHaveURL(/\/loans\?pane=simulations$/);
  await expect(page.getByRole('tab', { name: 'Bản mô phỏng' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.goBack();
  await button('Trung tâm hỗ trợ').click();
  await expect(page.getByRole('button', { name: 'Quản lý tài khoản và bảo mật' })).toBeVisible();
  await back().click();
  await button('Về Finora').click();
  await expect(page.getByText(/^Finora giúp bạn so sánh phương án vay/)).toBeVisible();
  await back().click();
  await expect(page.getByTestId('account-hub-cover')).toBeVisible();
});
