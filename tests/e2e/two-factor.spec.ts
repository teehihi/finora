import { createHmac, randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const api = 'http://localhost:3000/api/auth';
const inbox = 'http://127.0.0.1:8025';
const headers = { Origin: 'http://localhost:8081' };
const secretPattern = /^[A-Z2-7]+$/;
const backupPattern = /[A-Za-z0-9]{5}-[A-Za-z0-9]{5}/;

function totp(key: string, offset = 0) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...key].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('');
  const secret = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offset));
  const digest = createHmac('sha1', secret).update(counter).digest();
  return String((digest.readUInt32BE(digest[19]! & 15) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

function wrongTotp(key: string) {
  const nearby = [-2, -1, 0, 1, 2].map((step) => totp(key, step));
  return ['111111', '222222', '333333', '444444', '555555', '666666'].find(
    (code) => !nearby.includes(code),
  )!;
}

async function receivedCode(request: APIRequestContext, email: string) {
  const result = await request.get(inbox + '/api/v1/search', {
    params: { query: `to:${email}`, limit: '1' },
  });
  const [latest] = (await result.json()).messages ?? [];
  if (!latest) return null;
  const message = await request.get(inbox + '/api/v1/message/' + latest.ID);
  return ((await message.json()).Text ?? '').match(/(?<!\d)\d{6}(?!\d)/)?.[0] ?? null;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function signIn(request: APIRequestContext, email: string, password: string) {
  const post = () => request.post(api + '/sign-in/email', { headers, data: { email, password } });
  let result = await post();
  for (let i = 0; result.status() === 429 && i < 2; i += 1) {
    await delay(10_500);
    result = await post();
  }
  return result;
}

async function submitPassword(page: Page) {
  const submit = () =>
    Promise.all([
      page.waitForResponse((response) => response.url() === api + '/sign-in/email'),
      page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(),
    ]).then(([response]) => response.status());
  let status = await submit();
  for (let i = 0; status === 429 && i < 2; i += 1) {
    await delay(10_500);
    status = await submit();
  }
  return status;
}

const session = async (request: APIRequestContext) =>
  (await request.get(api + '/get-session', { headers })).json();

test('password and email then authenticator, recovery, and disable', async ({
  browser,
  context,
  page,
  request,
}, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const email = randomUUID() + '@example.test';
  const password = randomUUID();
  expect(
    (await createLegacyAccount(context.request, { email, password, name: 'Minh An' })).ok(),
  ).toBe(true);

  let code: string | null = null;
  async function mailCode() {
    await expect.poll(async () => (code = await receivedCode(request, email))).toMatch(/^\d{6}$/);
    return code!;
  }

  await page.goto('/profile/personal');
  const enable = page.getByRole('button', { name: 'Bật xác thực hai bước', exact: true });
  await expect(enable).toBeDisabled();
  const verifyEmail = (path: string, data: object) =>
    context.request.post(api + path, { headers, data });
  expect(
    (
      await verifyEmail('/email-otp/send-verification-otp', { email, type: 'email-verification' })
    ).ok(),
  ).toBe(true);
  expect(
    (await verifyEmail('/email-otp/verify-email', { email, otp: await mailCode() })).ok(),
  ).toBe(true);
  await page.reload();
  await expect(enable).toBeEnabled();

  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const alternate = await browser.newContext();
  try {
    expect((await signIn(other.request, email, password)).ok()).toBe(true);
    await enable.click();
    const setup = page.getByRole('dialog');
    await setup.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password);
    await setup.getByRole('button', { name: 'Tạo mã QR' }).click();
    await expect(setup.getByRole('img', { name: 'Tạo mã QR' })).toBeVisible();
    const key = (await setup.getByTestId('two-factor-setup-key').textContent())?.trim() ?? '';
    const backup =
      (await setup.getByTestId('two-factor-backup-codes').textContent())?.match(
        backupPattern,
      )?.[0] ?? '';
    expect(key).toMatch(secretPattern);
    expect(backup).toMatch(backupPattern);
    expect((await session(context.request)).user.twoFactorEnabled).toBe(false);
    await setup.getByLabel('Mã xác thực 6 số').fill(wrongTotp(key));
    await setup.getByRole('button', { name: 'Xác nhận và bật' }).click();
    await expect(setup.getByText('Mã không đúng. Kiểm tra và thử lại.')).toBeVisible();
    await setup.getByLabel('Mã xác thực 6 số').fill(totp(key));
    await setup.getByRole('button', { name: 'Xác nhận và bật' }).click();
    await expect(page.getByRole('button', { name: 'Tắt xác thực hai bước' })).toBeVisible();
    expect((await session(context.request)).user.twoFactorEnabled).toBe(true);
    expect(await session(other.request)).toBeNull();

    const tryAlt = (path: string, data: object) =>
      alternate.request.post(api + path, { headers, data });
    const login = await other.newPage();
    await login.goto('/auth');
    await login.getByRole('button', { name: 'Dùng mật khẩu hiện có' }).click();
    await login.getByLabel('Email', { exact: true }).fill(email);
    await login.getByLabel('Mật khẩu', { exact: true }).fill('not-the-right-password');
    expect(await submitPassword(login)).toBe(401);
    await expect(login.getByRole('alert')).toBeVisible();
    await expect(login.getByRole('heading', { name: 'Xác thực hai bước' })).toHaveCount(0);
    await login.getByLabel('Mật khẩu', { exact: true }).fill(password);
    expect(await submitPassword(login)).toBe(200);
    await expect(login.getByRole('heading', { name: 'Xác thực hai bước' })).toBeVisible();
    expect(await session(other.request)).toBeNull();
    expect(
      (await other.request.get('http://localhost:3000/api/account', { headers })).status(),
    ).toBe(401);
    await login.screenshot({ path: info.outputPath('authenticator-challenge.png') });
    const confirm = login.getByRole('button', { name: 'Xác minh và tiếp tục' });
    const input = login.getByLabel('Mã xác thực 6 số');
    await input.fill(wrongTotp(key));
    await confirm.click();
    await expect(login.getByText('Mã không đúng. Kiểm tra và thử lại.')).toBeVisible();
    expect(await session(other.request)).toBeNull();
    await input.fill(totp(key));
    await confirm.click();
    await expect(login).toHaveURL(/\/home$/);

    const enterBackup = async () => {
      const challenge = await signIn(alternate.request, email, password);
      expect((await challenge.json()).twoFactorRedirect).toBe(true);
      expect(await session(alternate.request)).toBeNull();
      return tryAlt('/two-factor/verify-backup-code', { code: backup, trustDevice: true });
    };
    expect((await enterBackup()).ok()).toBe(true);
    expect((await session(alternate.request)).user.twoFactorEnabled).toBe(true);
    expect((await tryAlt('/sign-out', {})).ok()).toBe(true);
    expect((await enterBackup()).ok()).toBe(false);
    expect(await session(alternate.request)).toBeNull();

    // The real per-address cooldown also applies after profile email verification.
    await expect
      .poll(
        async () =>
          (await tryAlt('/email-otp/send-verification-otp', { email, type: 'sign-in' })).status(),
        { timeout: 38_000, intervals: [23_000, 6_000, 5_000] },
      )
      .toBe(200);
    const earlier = code;
    await expect.poll(async () => (code = await receivedCode(request, email))).not.toBe(earlier);
    const emailFactor = await tryAlt('/sign-in/email-otp', { email, otp: code });
    expect(emailFactor.status()).toBe(200);
    expect((await emailFactor.json()).twoFactorRedirect).toBe(true);
    expect(await session(alternate.request)).toBeNull();
    const factorStatus = await alternate.request.get(api + '/two-factor/status', { headers });
    expect(await factorStatus.json()).toEqual({ required: true });
    expect((await tryAlt('/two-factor/verify-totp', { code: totp(key) })).ok()).toBe(true);
    expect((await session(alternate.request)).user.twoFactorEnabled).toBe(true);
    expect((await tryAlt('/sign-out', {})).ok()).toBe(true);

    await page.getByRole('button', { name: 'Tắt xác thực hai bước' }).click();
    const disable = page.getByRole('dialog');
    await disable.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password);
    await disable.getByRole('button', { name: 'Tắt xác thực hai bước' }).click();
    await expect(enable).toBeVisible();
    expect(
      (await (await signIn(alternate.request, email, password)).json()).user.twoFactorEnabled,
    ).toBe(false);
  } finally {
    await other.close();
    await alternate.close();
  }
});
