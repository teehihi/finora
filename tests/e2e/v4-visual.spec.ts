import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { syntheticLoanOfferPdf } from '../../apps/app/src/features/documents/fixture';
import { createLegacyAccount } from './legacy-fixture';

const captureDirectory = process.env.FINORA_V4_CAPTURE_DIR;
const signatureCapture = process.env.FINORA_V5_EXTRA === '1';
const signatureWidths = signatureCapture ? [390, 430, 768, 1440] : [390, 1440];
const api = 'http://localhost:3000/api';
const headers = { Origin: 'http://localhost:8081' };
const widths = [375, 390, 430, 768, 1024, 1440];

test.skip(!captureDirectory, 'Set FINORA_V4_CAPTURE_DIR to render real app screenshots.');

test('capture every major Finora route with real local fixtures', async ({ page }) => {
  test.setTimeout(240_000);
  const widthHeight = (width: number) =>
    width <= 430 ? (width === 375 ? 812 : width === 390 ? 844 : 932) : 960;
  const viewport = (width: number) => page.setViewportSize({ width, height: widthHeight(width) });
  const capture = async (screen: string, width: number, theme = 'light') => {
    await viewport(width);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: resolve(captureDirectory!, `${screen}-${theme}-${width}.png`),
      animations: 'disabled',
    });
  };
  const noOverflow = async (screen: string, width: number) => {
    await viewport(width);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
        message: `${screen} at ${width}px must fit without page overflow`,
      })
      .toBeLessThanOrEqual(0);
  };
  const openScreen = async (pathname: string, screen: string, verify?: () => Promise<void>) => {
    await viewport(390);
    await page.goto(pathname);
    await expect(page).toHaveURL((url) => url.pathname === pathname.split('?')[0]);
    if (verify) await verify();
    await page.waitForLoadState('networkidle');
    for (const width of widths) {
      await noOverflow(screen, width);
      if (
        width === 390 ||
        width === 1440 ||
        screen === 'home' ||
        (signatureCapture &&
          ['home-empty', 'assistant', 'simulator', 'auth', 'discovery'].includes(screen) &&
          signatureWidths.includes(width))
      )
        await capture(screen, width);
    }
  };

  await openScreen('/auth', 'auth');
  if (signatureCapture) {
    await page.route('**/api/auth/providers', (route) =>
      route.fulfill({
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:8081',
          'Access-Control-Allow-Credentials': 'true',
        },
        json: { error: 'Service unavailable' },
      }),
    );
    try {
      await viewport(390);
      await page.goto('/auth');
      await expect(page.getByRole('button', { name: 'Thử kết nối lại' })).toBeVisible();
      await capture('auth-recovery', 390);
    } finally {
      await page.unroute('**/api/auth/providers');
    }
  }
  const landing = process.env.FINORA_V4_LANDING_PATH;
  if (landing) {
    await openScreen(landing, 'public-landing');
  }

  // Use the real OTP UI and SMTP delivery rather than a mocked API response.
  await viewport(390);
  await page.goto('/auth');
  const otpEmail = `an-otp-${randomUUID().slice(0, 6)}@example.test`;
  await page.getByLabel('Email', { exact: true }).fill(otpEmail);
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra email' })).toBeVisible();
  for (const width of [390, 1440]) await capture('otp', width);
  const findCode = async () => {
    const response = await page.request.get('http://127.0.0.1:8025/api/v1/search', {
      params: { query: `to:${otpEmail}` },
    });
    const { messages } = (await response.json()) as { messages?: { ID: string }[] };
    if (!messages?.[0]) return '';
    const message = await page.request.get(
      'http://127.0.0.1:8025/api/v1/message/' + messages[0].ID,
    );
    return ((await message.json()) as { Text?: string }).Text?.match(/\b\d{6}\b/)?.[0] ?? '';
  };
  await expect.poll(findCode).toMatch(/^\d{6}$/);
  await page.getByLabel('Mã xác minh 6 số').fill(await findCode());
  await page.getByRole('button', { name: 'Xác minh và tiếp tục' }).click();
  await expect(page).toHaveURL(/\/home$/);

  // A separate synthetic owner provides the named reference and Money/Loan fixtures.
  await page.context().clearCookies();
  const result = await createLegacyAccount(page.request, {
    name: 'Nguyễn An',
    email: `an-${randomUUID().slice(0, 6)}@example.test`,
    password: randomUUID(),
  });
  expect(result.ok(), await result.text()).toBe(true);
  if (signatureCapture) {
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/account', async (route) => {
      await pending;
      await route.continue();
    });
    try {
      await viewport(390);
      await page.goto('/home');
      await expect(page.getByRole('progressbar').first()).toBeVisible();
      await capture('home-loading', 390);
      const accountLoaded = page.waitForResponse((response) =>
        response.url().endsWith('/api/account'),
      );
      release();
      expect((await accountLoaded).ok()).toBeTruthy();
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  }
  await openScreen('/home', 'home-empty', async () => {
    await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();
  });
  await openScreen('/profile', 'financial-profile-onboarding', async () => {
    await expect(page.getByLabel('Thu nhập hằng tháng')).toBeVisible();
  });

  const profile = await page.request.put(api + '/profile', {
    headers,
    data: { income: 15_000_000, expenses: 8_000_000, debt: 1_000_000 },
  });
  expect(profile.ok(), await profile.text()).toBe(true);
  const repayments = await page.request.get(api + '/repayments');
  expect(repayments.ok()).toBe(true);
  const { today } = (await repayments.json()) as { today: string };
  const scenario = await page.request.post(api + '/simulations', {
    headers,
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 45_000_000,
        months: 24,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: today,
      },
    },
  });
  expect(scenario.ok(), await scenario.text()).toBe(true);
  const { id: scenarioId } = (await scenario.json()) as { id: string };
  const tracked = await page.request.post(api + '/repayments', {
    headers,
    data: { simulationId: scenarioId, title: 'Kế hoạch sửa nhà', confirmed: true },
  });
  expect(tracked.ok(), await tracked.text()).toBe(true);

  await openScreen('/home', 'home');
  await viewport(390);
  const nextLoan = page.getByText(/^Kế hoạch sửa nhà/).first();
  await expect(nextLoan).toBeVisible();
  await nextLoan.scrollIntoViewIfNeeded();
  await capture('home-upcoming', 390);
  await openScreen('/explore', 'discovery');
  await viewport(390);
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Xem nguồn và điều kiện: Vay tiền mặt online' }).click();
  await expect(
    page.getByRole('button', { name: /Mở nguồn chính thức: Home Credit/ }),
  ).toBeVisible();
  for (const width of [390, 1440]) await capture('loan-details', width);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  for (const name of ['Vay tiền mặt online', 'Vay tiêu dùng']) {
    await page.getByRole('checkbox', { name: 'Chọn so sánh: ' + name }).click();
  }
  await page.getByRole('button', { name: 'So sánh điều kiện', exact: true }).click();
  await expect(page.getByText(/Chỉ đối chiếu điều kiện, không xếp hạng chi phí/)).toBeVisible();
  for (const width of [390, 1440]) await capture('comparison', width);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await openScreen('/simulate/personal-flex', 'simulator');
  await viewport(390);
  await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
  await expect(page.getByRole('button', { name: 'Lưu bản mô phỏng' })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu bản mô phỏng' }).scrollIntoViewIfNeeded();
  await capture('simulator-estimate', 390);
  if (signatureCapture) {
    for (const width of signatureWidths.slice(1)) {
      await viewport(width);
      await page.getByRole('heading', { name: 'Chi tiết trả nợ' }).scrollIntoViewIfNeeded();
      await capture('simulator-estimate', width);
    }
  }
  await openScreen('/saved/' + scenarioId, 'saved-loan');
  await openScreen('/loans', 'loan-activity');
  await openScreen('/repayments', 'repayments', async () => {
    await expect(page.getByRole('heading', { name: 'Kế hoạch sửa nhà' })).toBeVisible();
  });

  await openScreen('/assistant', 'assistant');
  await openScreen('/intelligence', 'intelligence');
  await viewport(390);
  await page
    .getByLabel('Bạn đang cân nhắc khoản vay nào?')
    .fill('Tôi muốn vay 50 triệu trong 24 và 36 tháng, lãi suất 12% năm, trả góp đều');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const aiResult = page.getByRole('heading', { name: 'Kịch bản trả nợ · 24 tháng' });
  await expect(aiResult).toBeVisible();
  for (const width of signatureWidths) {
    await viewport(width);
    await aiResult.scrollIntoViewIfNeeded();
    await capture('intelligence-structured', width);
  }
  await openScreen('/documents', 'document-intake');
  await viewport(390);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn PDF hoặc ảnh' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'finora-offer-synthetic.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(syntheticLoanOfferPdf()),
  });
  await expect(page.getByRole('heading', { name: 'Rà soát đề nghị vay' })).toBeVisible();
  for (const width of widths) {
    await noOverflow('document-review', width);
    if (width === 390 || width === 1440) await capture('document-review', width);
  }
  await openScreen('/profile', 'settings');
  const darkOption = page.getByRole('radio', { name: 'Tối', exact: true });
  for (const width of [390, 1440]) {
    await viewport(width);
    await darkOption.scrollIntoViewIfNeeded();
    await capture('settings-preferences', width);
  }
  await viewport(390);
  await darkOption.click();
  await expect(page.getByRole('radio', { name: 'Tối', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Tối', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await capture('settings', 390, 'dark');
  await darkOption.scrollIntoViewIfNeeded();
  await capture('settings-preferences', 390, 'dark');
  for (const [route, screen] of [
    ['home', 'home'],
    ['intelligence', 'intelligence'],
    ...(signatureCapture ? [['simulate/personal-flex', 'simulator']] : []),
    ['explore', 'discovery'],
    ['repayments', 'repayments'],
  ]) {
    await page.goto('/' + route);
    await expect(page).toHaveURL((url) => url.pathname === '/' + route);
    await page.waitForLoadState('networkidle');
    await capture(screen, 390, 'dark');
  }
});
