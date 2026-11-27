import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const base = 'http://localhost:3000/api';

test('cash flow map isolates demo, uses only unpaid owned entries, and never writes to the ledger', async ({
  context,
  page,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Forecast QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  const ledger = async () => {
    const result = await context.request.get(base + '/repayments');
    expect(result.ok()).toBe(true);
    return result.json();
  };
  const { today } = await ledger();
  const saved = await context.request.post(base + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 12000000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: today,
      },
    },
  });
  expect(saved.ok()).toBe(true);
  const { id: simulationId } = await saved.json();
  const tracked = await context.request.post(base + '/repayments', {
    data: { simulationId, title: 'Khoản vay riêng QA', confirmed: true },
  });
  expect(tracked.ok()).toBe(true);
  const before = await ledger();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home');
  await page.getByRole('button', { name: 'Bản đồ dòng tiền 90 ngày', exact: true }).click();
  await expect(page).toHaveURL(/\/cashflow$/);
  const title = page.getByRole('heading', { name: 'Bản đồ dòng tiền 90 ngày' });
  await expect(title).toBeVisible();
  await page.getByRole('radio', { name: 'Thử dữ liệu mẫu' }).click();
  await expect(page.getByRole('heading', { name: /1\.200\.000/ })).toBeVisible();
  await expect(page.getByText(/Khoản vay riêng QA/).filter({ visible: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('cashflow-sample-390.png') });
  await page.getByRole('button', { name: /Thử thêm tiền đầu kỳ/ }).click();
  await expect(page.getByRole('heading', { name: 'Không hụt cuối ngày' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('cashflow-buffer-390.png') });
  await page.getByRole('button', { name: 'Về kế hoạch gốc' }).click();
  await expect(page.getByText(/Bắt đầu hụt/)).toBeVisible();
  await page.getByRole('radio', { name: 'Kế hoạch của tôi' }).click();
  const calculate = page.getByRole('button', { name: 'Tính dự báo' });
  await calculate.click();
  await expect(page.getByText(/Nhập số nguyên/)).toBeVisible();
  await page.getByLabel('Tiền đang có (₫)', { exact: true }).fill('0');
  await calculate.click();
  await expect(page.getByText('Hụt nhiều nhất', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Khoản vay riêng QA', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('Kỳ trả góp mẫu', { exact: true })).toHaveCount(0);
  const initialShortfall = await page.getByText(/Bắt đầu hụt/).textContent();
  expect(initialShortfall).toBeTruthy();
  await page.getByRole('button', { name: 'Sửa giả định' }).click();
  await expect(page.getByText('Hụt nhiều nhất', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Tiền đang có (₫)', { exact: true })).toHaveValue('0');
  expect(await ledger()).toEqual(before);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);

  const paid = await context.request.put(
    base + '/repayments/' + before.loans[0].id + '/payments/1',
    {
      data: { paid: true, confirmed: true },
    },
  );
  expect(paid.ok()).toBe(true);
  await page.goto('/loans');
  await page.getByRole('button', { name: 'Bản đồ dòng tiền 90 ngày', exact: true }).click();
  await expect(page.getByLabel('Tiền đang có (₫)', { exact: true })).toHaveValue('');
  await page.getByLabel('Tiền đang có (₫)', { exact: true }).fill('0');
  await calculate.click();
  await expect(page.getByText(/Bắt đầu hụt/)).toBeVisible();
  await expect(page.getByText(/Bắt đầu hụt/)).not.toHaveText(initialShortfall ?? '');
});

test('when ledger is unavailable the demo still works and a personal forecast is not invented', async ({
  context,
  page,
}) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Forecast Error QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  await page.route('**/api/repayments', (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/cashflow');
  await expect(page.getByText(/Chưa đọc được sổ trả nợ/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tính dự báo' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Thử dữ liệu mẫu' }).click();
  await expect(page.getByText('Hụt nhiều nhất', { exact: true })).toBeVisible();
});

test('small dark mode and desktop keep the sample readable and within the viewport', async ({
  context,
  page,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Forecast Visual QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/profile');
  const dark = page.getByRole('radio', { name: 'Tối', exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await page.goto('/cashflow');
  await page.getByRole('radio', { name: 'Thử dữ liệu mẫu' }).click();
  await expect(page.getByText('Hụt nhiều nhất', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const personalMode = await page.getByRole('radio', { name: 'Kế hoạch của tôi' }).boundingBox();
  const sampleMode = await page.getByRole('radio', { name: 'Thử dữ liệu mẫu' }).boundingBox();
  expect(personalMode?.y).toBe(sampleMode?.y);
  await expect(page.getByRole('heading', { name: /1\.200\.000/ })).toBeInViewport();
  await page.screenshot({ path: info.outputPath('cashflow-sample-320-dark.png') });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/profile');
  const light = page.getByRole('radio', { name: 'Sáng', exact: true });
  await light.click();
  await expect(light).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(light).toHaveAttribute('aria-checked', 'true');
  await page.goto('/cashflow');
  await page.getByRole('radio', { name: 'Kế hoạch của tôi' }).click();
  await page.getByLabel('Tiền đang có (₫)').fill('1000000');
  await page.getByLabel('Thu nhập mỗi tháng (₫)').fill('6000000');
  await page.getByLabel('Ngày nhận thu nhập').fill('28');
  await page.getByRole('button', { name: 'Tính dự báo' }).click();
  await expect(page.getByRole('heading', { name: 'Không hụt cuối ngày' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('cashflow-personal-1440.png') });
});
