import { createLegacyAccount } from './legacy-fixture';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const widths = [360, 390, 430, 768, 1024, 1440, 1920];
test('Vietnamese borrowing journey, persisted login and responsive navigation', async ({
  page,
  request,
}, info) => {
  const email = 'finora-' + randomUUID() + '@example.test',
    password = randomUUID() + 'aA';
  // The upstream app boots to sign-in; the public product tour is a separate entry.
  await page.goto('/showcase');
  const start = page.getByRole('button', { name: 'Bắt đầu cùng Finora' });
  await expect(start).toBeVisible();
  await page.waitForFunction(
    () =>
      document.images.length >= 2 &&
      Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({ path: info.outputPath('welcome-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('welcome-mobile.png') });
  // Create a legacy password account in a separate cookie jar, then exercise
  // the secondary sign-in UI against that existing account.
  const legacy = await createLegacyAccount(request, { name: 'An', email, password });
  expect(legacy.ok()).toBe(true);
  await start.click();
  await page.getByRole('button', { name: 'Dùng mật khẩu hiện có' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Chào, An' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thêm hồ sơ tài chính' })).toBeVisible();
  await expect(page.getByText('Chưa có bản mô phỏng')).toBeVisible();
  await page.screenshot({ path: info.outputPath('home-empty.png') });
  await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
  await page.getByLabel('Thu nhập hằng tháng').fill('20000000');
  await page.getByLabel('Chi phí sinh hoạt').fill('9000000');
  await page.getByLabel('Tiền trả nợ hiện tại').fill('1500000');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu thay đổi.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const profileTab = await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).boundingBox();
  const loansTab = await page.getByRole('tab', { name: 'Khoản vay', exact: true }).boundingBox();
  expect(profileTab && loansTab).toBeTruthy();
  await page.mouse.move(
    profileTab!.x + profileTab!.width / 2,
    profileTab!.y + profileTab!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(loansTab!.x + loansTab!.width / 2, loansTab!.y + loansTab!.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/loans/);
  await page.getByRole('tab', { name: 'Khám phá' }).click();
  await page.getByRole('radio', { name: 'Bản mô phỏng mẫu', exact: true }).click();
  await page.getByLabel('Tìm sản phẩm hoặc tổ chức').fill('Chi tiêu linh hoạt');
  await page.getByRole('button', { name: 'Mô phỏng trả nợ' }).click();
  await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
  await expect(page.getByText('Phí chưa xác định.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu bản mô phỏng' }).click();
  await expect(page).toHaveURL(/\/saved\//);
  const url = page.url();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chi tiết trả nợ' })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('tab', { name: 'Khám phá' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await expect(page.getByText('Tổng tiền gồm phí', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Giải thích cùng Finora AI' }).click();
  await page.getByLabel('Nhập câu hỏi của bạn').fill('Giải thích bản mô phỏng');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText(/Tổng gốc và lãi theo lịch là/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByText(/Tổng gốc và lãi theo lịch là/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Tổng quan' }).click();
  await expect(page.getByText(/5\.500\.000/)).toBeVisible();
  await expect(page.getByText('Chi tiêu linh hoạt', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: info.outputPath('home-populated.png') });
  await page.getByRole('tab', { name: 'Hồ sơ', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.goto(url);
  await expect(page).toHaveURL(/\/auth/);
  await page.getByRole('button', { name: 'Dùng mật khẩu hiện có' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(url);
  await page.getByRole('tab', { name: 'Khoản vay' }).click();
  await expect(page).toHaveURL(/\/loans/);
  await page.getByRole('tab', { name: 'Bản mô phỏng', exact: true }).click();
  await page.getByRole('button', { name: 'Chi tiêu linh hoạt' }).click();
  await expect(page).toHaveURL(url);
});
