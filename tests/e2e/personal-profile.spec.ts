import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('personal profile saves its display name and updates an existing password', async ({
  browser,
  page,
  context,
}, info) => {
  const email = randomUUID() + '@example.test';
  const password = randomUUID();
  const updated = randomUUID();
  const origin = { Origin: 'http://localhost:8081' };
  const authBase = 'http://localhost:3000/api/auth';
  expect(
    (await createLegacyAccount(context.request, { name: 'Minh An', email, password })).ok(),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile/personal');
  const identity = page.getByTestId('personal-profile-identity');
  const edit = page.getByRole('button', { name: 'Chỉnh sửa', exact: true });
  const signInMethods = page.getByText('Phương thức đăng nhập', { exact: true });
  const nameInput = page.getByRole('textbox', { name: 'Tên hiển thị', exact: true });
  const save = page.getByRole('button', { name: 'Lưu thay đổi', exact: true });
  await expect(identity.getByRole('heading', { name: 'Minh An' })).toBeVisible();
  await expect(signInMethods).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đổi mật khẩu', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('personal-profile.png'), animations: 'disabled' });

  await edit.click();
  await nameInput.fill(' ');
  await save.click();
  await expect(page.getByText('Nhập tên từ 1 đến 80 ký tự.')).toBeVisible();
  await nameInput.fill('Tên nháp');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(identity.getByRole('heading', { name: 'Minh An' })).toBeVisible();
  await edit.click();
  await nameInput.fill('  An Nguyễn  ');
  await save.click();
  await expect(identity.getByRole('heading', { name: 'An Nguyễn' })).toBeVisible();
  await page.goto('/profile');
  await expect(page.getByTestId('account-hub-hero').getByText('An Nguyễn')).toBeVisible();
  expect(
    (
      await context.request.post(authBase + '/update-user', {
        headers: origin,
        data: { name: 'x'.repeat(81) },
      })
    ).status(),
  ).toBe(400);

  await page.goto('/profile/personal');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill('incorrect-password');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(updated);
  await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill(updated);
  await save.click();
  await expect(page.getByText('Mật khẩu hiện tại chưa đúng.')).toBeVisible();
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password);
  await save.click();
  await expect(page.getByText('Đã đổi mật khẩu.')).toBeVisible();

  const secondDevice = await browser.newContext();
  try {
    const signIn = (candidate: string) =>
      secondDevice.request.post(authBase + '/sign-in/email', {
        headers: origin,
        data: { email, password: candidate },
      });
    expect((await signIn(password)).ok()).toBe(false);
    const loggedIn = await signIn(updated);
    expect(loggedIn.ok()).toBe(true);
    expect((await loggedIn.json()).user.name).toBe('An Nguyễn');
  } finally {
    await secondDevice.close();
  }
});
