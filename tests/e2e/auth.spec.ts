import { createLegacyAccount } from './legacy-fixture';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const inbox = 'http://127.0.0.1:8025';

async function receivedCode(request: APIRequestContext, address: string): Promise<string | null> {
  const query = new URLSearchParams({ query: `to:${address}`, limit: '20' });
  const search = await request.get(`${inbox}/api/v1/search?${query}`);
  if (!search.ok()) throw new Error(`Mailpit search returned ${search.status()}`);
  const { messages } = (await search.json()) as { messages?: { ID: string }[] };
  if (!messages?.[0]) return null;
  const message = await request.get(`${inbox}/api/v1/message/${messages[0].ID}`);
  if (!message.ok()) return null;
  const { Text, To } = (await message.json()) as { Text?: string; To?: { Address: string }[] };
  if (!To?.some(({ Address }) => Address.toLowerCase() === address.toLowerCase())) return null;
  return Text?.match(/(?<!\d)\d{6}(?!\d)/)?.[0] ?? null;
}

test('email OTP creates a session using the real local Mailpit message', async ({
  page,
  request,
}) => {
  const email = `finora-otp-${randomUUID()}@example.test`;
  // Do not silently substitute a mocked code. The supported local setup starts Mailpit.
  expect(
    (await request.get(`${inbox}/api/v1/messages`)).ok(),
    'Run pnpm setup to start Mailpit',
  ).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Bắt đầu với Finora' })).toBeVisible();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra email' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled();

  await expect.poll(() => receivedCode(request, email)).toMatch(/^\d{6}$/);
  const code = await receivedCode(request, email);
  if (!code) throw new Error('Mailpit never returned a verification code');

  const field = page.getByLabel('Mã xác minh 6 số');
  await field.fill(code === '000000' ? '000001' : '000000');
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page.getByRole('alert')).toContainText('Mã không đúng hoặc đã hết hạn');
  await field.fill(code.slice(0, 3) + ' ' + code.slice(3));
  await expect(field).toHaveValue(code);
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.reload();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('tab', { name: 'Hồ sơ' })).toBeVisible();
});

test('an authenticated legacy user verifies their own email without losing password access', async ({
  page,
  context,
  request,
}) => {
  const email = `finora-legacy-${randomUUID()}@example.test`;
  const password = randomUUID();
  const created = await createLegacyAccount(context.request, { name: 'An', email, password });
  expect(created.ok()).toBe(true);

  async function signIn() {
    await page.getByRole('button', { name: 'Dùng mật khẩu hiện có' }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  }

  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Email chưa xác minh', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xác minh email này' }).click();
  await expect.poll(() => receivedCode(request, email)).toMatch(/^\d{6}$/);
  const code = await receivedCode(request, email);
  if (!code) throw new Error('Mailpit never returned a profile verification code');
  await page.getByLabel('Mã xác minh 6 số').fill(code);
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page.getByText('Email đã xác minh', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/auth');
  await signIn();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('tab', { name: 'Hồ sơ' }).click();
  await expect(page.getByText('Email đã xác minh', { exact: true })).toBeVisible();
});
