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

test('the app opens on login when no session exists', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

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

  let sends = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/auth/email-otp/send-verification-otp'
    )
      sends += 1;
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra email' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled();

  // Returning from the email editor with the same address must not invalidate the code.
  await page.getByRole('button', { name: 'Sửa email' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email);
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra email' })).toBeVisible();
  expect(sends).toBe(1);

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
  await expect(page).toHaveURL(/\/auth$/);
  await signIn();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('tab', { name: 'Hồ sơ' }).click();
  await expect(page.getByText('Email đã xác minh', { exact: true })).toBeVisible();
});

test('email OTP returns to the sample comparison requested before sign-in', async ({
  page,
  request,
}) => {
  const email = `finora-otp-return-${randomUUID()}@example.test`;
  const destination = '/explore?mode=sample&intent=compare';
  await page.goto(destination);
  await expect(page).toHaveURL((url) => {
    return url.pathname === '/auth' && url.searchParams.get('returnTo') === destination;
  });
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click();
  await expect.poll(() => receivedCode(request, email)).toMatch(/^\d{6}$/);
  const code = await receivedCode(request, email);
  if (!code) throw new Error('Mailpit never returned a verification code');
  await page.getByLabel('Mã xác minh 6 số').fill(code);
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page).toHaveURL((url) => url.pathname + url.search === destination);
  await expect(
    page.getByText('Chọn hai sản phẩm để tính với cùng số tiền và kỳ hạn.'),
  ).toBeVisible();
});

test('password sign-in returns to the saved simulations tab requested before sign-in', async ({
  page,
  request,
}) => {
  const email = `finora-password-return-${randomUUID()}@example.test`;
  const password = randomUUID();
  const created = await createLegacyAccount(request, { name: 'An', email, password });
  expect(created.ok()).toBe(true);
  const destination = '/loans?pane=simulations';
  await page.goto(destination);
  await expect(page).toHaveURL((url) => {
    return url.pathname === '/auth' && url.searchParams.get('returnTo') === destination;
  });
  await page.getByRole('button', { name: 'Dùng mật khẩu hiện có' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname + url.search === destination);
  await expect(page.getByRole('tab', { name: 'Bản mô phỏng', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

const fixtureCors = {
  'access-control-allow-origin': 'http://localhost:8081',
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

test('public tour compares an illustrative repayment without a session or API calculator', async ({
  page,
}) => {
  const quoteRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/simulations')) quoteRequests.push(request.url());
  });
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/showcase');
  const result = page.getByTestId('showcase-first-payment');
  await expect(result).toBeVisible();
  const first = await result.textContent();
  const longer = page.getByRole('radio', { name: '24 tháng' });
  await longer.click();
  await expect(longer).toBeChecked();
  await expect(result).not.toHaveText(first ?? '');
  await expect(page.getByText(/không phải đề nghị cho vay/i)).toBeVisible();
  expect(quoteRequests).toHaveLength(0);
  await page.getByRole('button', { name: 'Bắt đầu cùng Finora' }).click();
  await expect(page).toHaveURL(/\/auth$/);
});

test('a provider outage can be retried without losing the entered email or inventing Google sign-in', async ({
  page,
}) => {
  let offline = true;
  await page.route('**/api/auth/providers', async (route) => {
    await route.fulfill({
      status: offline ? 503 : 200,
      headers: fixtureCors,
      json: offline ? { error: 'Service unavailable' } : { emailOtp: true, google: false },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth');
  const email = page.getByLabel('Email', { exact: true });
  await email.fill('recovery@example.test');
  const retry = page.getByRole('button', { name: 'Thử kết nối lại' });
  await expect(retry).toBeVisible();
  offline = false;
  await retry.click();
  await expect(retry).toBeHidden();
  await expect(email).toHaveValue('recovery@example.test');
  await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toHaveCount(0);
});

test('an accepted code is not submitted twice when restoring the session needs a retry', async ({
  page,
}) => {
  let restore = false;
  let verificationPosts = 0;
  const id = randomUUID();
  const now = new Date().toISOString();
  const user = {
    id,
    name: 'Finora Test',
    email: 'session-recovery@example.test',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  };
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      headers: fixtureCors,
      json: restore
        ? { user, session: { id, userId: id, expiresAt: '2030-01-01T00:00:00.000Z' } }
        : null,
    }),
  );
  await page.route('**/api/auth/email-otp/send-verification-otp', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: fixtureCors })
      : route.fulfill({ headers: fixtureCors, json: { success: true } }),
  );
  await page.route('**/api/auth/sign-in/email-otp', (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: fixtureCors });
    verificationPosts += 1;
    return route.fulfill({ headers: fixtureCors, json: { user, token: id } });
  });
  await page.goto('/auth');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click();
  await page.getByLabel('Mã xác minh 6 số').fill('234567');
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page.getByRole('heading', { name: 'Hoàn tất đăng nhập' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác minh và tiếp tục' })).toHaveCount(0);
  restore = true;
  await page.getByRole('button', { name: 'Kiểm tra lại phiên' }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(verificationPosts).toBe(1);
});
