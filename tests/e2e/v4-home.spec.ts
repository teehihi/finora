import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

test('Home separates repayment capacity from cash remaining and exposes the featured AI tab', async ({
  context,
  page,
}) => {
  const owner = await createLegacyAccount(context.request, {
    email: randomUUID() + '@example.test',
    name: 'An',
    password: randomUUID(),
  });
  expect(owner.ok()).toBeTruthy();

  const profile = async (expenses: number) => {
    const res = await context.request.put('http://localhost:3000/api/profile', {
      headers: { Origin: 'http://localhost:8081' },
      data: { income: 15_000_000, expenses, debt: 1_000_000 },
    });
    expect(res.ok()).toBeTruthy();
    await page.goto('/home');
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await profile(8_000_000);
  await expect(page.getByRole('heading', { name: /4\.250\.000/ })).toBeVisible();
  await expect(page.getByText('6 triệu ₫', { exact: true })).toBeVisible();
  await expect(page.getByText('Còn lại trước khoản vay mới')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tổng quan' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const ai = page.getByRole('tab', { name: 'Finora AI', exact: true });
  await expect(ai).toHaveAttribute('aria-selected', 'false');
  await ai.click();
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(ai).toHaveAttribute('aria-selected', 'true');

  await profile(16_000_000);
  await expect(page.getByText('Thiếu trước khoản vay mới')).toBeVisible();
  await expect(page.getByText('2 triệu ₫', { exact: true })).toBeVisible();
  await expect(page.getByText('Còn lại trước khoản vay mới')).toHaveCount(0);

  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  }
});

test('Home links each quick action to the real tool and opens saved simulations directly', async ({
  context,
  page,
}) => {
  const owner = await createLegacyAccount(context.request, {
    email: randomUUID() + '@example.test',
    name: 'An',
    password: randomUUID(),
  });
  expect(owner.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/home');
  const focus = page.getByTestId('home-ledger-focus');
  await expect(focus.getByRole('heading', { name: 'Chưa có lịch trả nợ' })).toBeVisible();
  await expect(focus.getByRole('button')).toHaveCount(1);
  await expect(focus.getByRole('button', { name: 'Mở sổ trả nợ' })).toBeVisible();
  await expect(focus).not.toContainText('₫');
  await expect(page.getByRole('button', { name: 'Finora', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Làm mới dữ liệu' })).toBeEnabled();

  const destinations = [
    ['Tìm khoản vay', /\/explore$/],
    ['Mô phỏng mẫu', /\/simulate\/personal-flex$/],
    ['So sánh mẫu', /\/explore\?mode=sample&intent=compare$/],
    ['Đọc hợp đồng', /\/documents$/],
    ['Lịch trả nợ', /\/repayments$/],
    ['Mở Finora AI', /\/assistant$/],
    ['Xem tất cả', /\/loans\?pane=simulations$/],
  ] as const;

  for (const [label, expectedUrl] of destinations) {
    await page.goto('/home');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(expectedUrl);
  }
  await expect(page.getByRole('tab', { name: 'Bản mô phỏng', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('Home stress sheet compares real profile cash flow without saving a change', async ({
  context,
  page,
}) => {
  const owner = await createLegacyAccount(context.request, {
    email: randomUUID() + '@example.test',
    name: 'An',
    password: randomUUID(),
  });
  expect(owner.ok()).toBeTruthy();
  const api = 'http://localhost:3000/api';
  const profile = { income: 15000000, expenses: 8000000, debt: 1000000 };
  const saved = await context.request.put(api + '/profile', {
    headers: { Origin: 'http://localhost:8081' },
    data: profile,
  });
  expect(saved.ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home');
  await page.getByRole('button', { name: 'Thử biến động dòng tiền', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Thử biến động dòng tiền', exact: true });
  await expect(sheet.getByRole('heading', { name: /3\.000\.000/ })).toBeVisible();
  await sheet.getByRole('radio', { name: 'Chi phí tăng 20%' }).click();
  await expect(sheet.getByRole('heading', { name: /4\.400\.000/ })).toBeVisible();
  await sheet.getByRole('radio', { name: 'Cả hai' }).click();
  await expect(sheet.getByRole('heading', { name: /1\.400\.000/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  const refreshed = await context.request.get(api + '/account');
  expect((await refreshed.json()).profile).toMatchObject(profile);
});

test('Home search finds local tools without accents and resets on Back', async ({
  context,
  page,
}, info) => {
  const account = await createLegacyAccount(context.request, {
    email: randomUUID() + '@example.test',
    name: 'An',
    password: randomUUID(),
  });
  expect(account.ok()).toBeTruthy();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/home');
  const launcher = page.getByRole('button', { name: 'Tìm tiện ích', exact: true });
  await launcher.click();
  await expect(page).toHaveURL(/\/search\/?$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByTestId('home-fixed-backdrop')).toBeHidden();
  const field = page.getByRole('textbox', { name: 'Tìm tiện ích' });
  await expect(field).toBeFocused();
  await field.fill('xyz');
  await expect(page.getByText(/Không có tiện ích phù hợp/)).toBeVisible();
  await page.getByRole('button', { name: 'Xóa từ khóa' }).click();
  await expect(field).toBeFocused();
  await expect(page.getByText('Tiện ích gợi ý')).toBeVisible();
  await page.screenshot({ path: info.outputPath('search-375.png') });
  await field.fill('hop dong');
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page).toHaveURL(/\/home\/?$/);
  await launcher.click();
  await expect(field).toHaveValue('');
  await field.fill('hop dong');
  await page.getByRole('button', { name: 'Đọc hợp đồng' }).click();
  await expect(page).toHaveURL(/\/documents\/?$/);
});
