import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

const base = 'http://localhost:3000/api';
const identity = () => ({
  name: 'Repayment QA',
  email: randomUUID() + '@example.test',
  password: randomUUID(),
});

test('saving a simulation does not create an obligation; tracking and payment both require explicit confirmation', async ({
  context,
  page,
  request,
}, info) => {
  expect((await createLegacyAccount(context.request, identity())).ok()).toBe(true);
  const initial = await context.request.get(base + '/repayments');
  expect(initial.ok()).toBe(true);
  const { today, loans } = await initial.json();
  expect(loans).toEqual([]);
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
  const { id: simulationId, result } = await saved.json();
  const ledger = async () => (await context.request.get(base + '/repayments')).json();
  expect((await ledger()).loans).toEqual([]);
  const input = { simulationId, title: 'Khoản vay QA', confirmed: true };
  expect(
    (
      await context.request.post(base + '/repayments', { data: { ...input, confirmed: false } })
    ).status(),
  ).toBe(400);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/loans');
  await expect(page.getByText('Chưa theo dõi khoản vay nào', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở sổ trả nợ' })).toHaveCount(0);
  await page.goto('/loans?pane=simulations');
  await expect(page.getByRole('tab', { name: 'Bản mô phỏng', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('Chỉ để mô phỏng', { exact: true })).toBeVisible();
  await page.goto('/saved/' + simulationId);
  await page.getByRole('button', { name: 'Theo dõi khoản vay thực tế', exact: true }).click();
  await expect(page.getByText(/Tôi xác nhận đây là khoản vay đã nhận/)).toBeVisible();
  expect((await ledger()).loans).toEqual([]);
  await page.getByLabel('Tên gợi nhớ', { exact: true }).fill(input.title);
  await page.getByRole('button', { name: 'Xác nhận và theo dõi', exact: true }).click();
  await expect(page).toHaveURL(/\/repayments$/);
  await expect(page.getByRole('heading', { name: input.title })).toBeVisible();
  await page.screenshot({ path: info.outputPath('repayments-390.png'), fullPage: true });
  const active = await ledger();
  expect(active.upcomingTotal).toBe(result.firstPayment);
  expect(active.loans[0].paidPeriods).toBe(0);
  const loanId = active.loans[0].id;

  await page.goto('/loans');
  await expect(page.getByText('Kỳ trả gần nhất', { exact: true })).toBeVisible();
  await expect(page.getByText('Đến hạn hôm nay', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lập kế hoạch trả' }).click();
  const planner = page.getByRole('dialog', { name: 'Kế hoạch trả kỳ tới' });
  await expect(planner).toBeVisible();
  await planner.getByRole('button', { name: 'Tính kế hoạch' }).click();
  await expect(planner.getByRole('alert')).toBeVisible();
  await planner.getByLabel('Đã để dành', { exact: true }).fill('0');
  await planner
    .getByLabel('Thu nhập sẽ nhận trước hoặc trong ngày hạn')
    .fill(String(result.firstPayment));
  await planner.getByLabel('Chi phí còn phải chi trước hoặc trong ngày hạn').fill('0');
  await planner.getByRole('button', { name: 'Tính kế hoạch' }).click();
  await expect(planner.getByText('Dự kiến vừa đủ')).toBeVisible();
  await planner.getByRole('radio', { name: 'Thu nhập giảm 20%' }).click();
  await expect(planner.getByText('Dự kiến còn thiếu')).toBeVisible();
  await expect(planner.getByRole('radio', { name: 'Thu nhập giảm 20%' })).toBeChecked();
  await planner.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(planner).not.toBeVisible();
  expect(await ledger()).toEqual(active);
  await page.getByRole('button', { name: input.title, exact: true }).click();
  await expect(page.getByText(/Tiền gốc:.*Tiền lãi:/)).toBeVisible();
  await expect(page.getByText('Đã xác nhận 0/12 kỳ', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('loan-center-390.png'), fullPage: true });
  await page.getByRole('button', { name: 'Mở sổ trả nợ' }).click();
  await expect(page).toHaveURL(/\/repayments$/);

  const repeated = await context.request.post(base + '/repayments', { data: input });
  expect((await repeated.json()).id).toBe(loanId);
  expect((await ledger()).loans).toHaveLength(1);
  await expect(page.getByText('Kỳ trả sắp tới', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem và ghi nhận kỳ này' }).click();
  const focusDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Xác nhận đã trả', exact: true }),
  });
  await expect(focusDialog).toBeVisible();
  await expect(focusDialog.getByText(/không chuyển tiền/)).toBeVisible();
  await focusDialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(focusDialog).not.toBeVisible();
  expect(await ledger()).toEqual(active);
  await page.getByRole('button', { name: /Xem kỳ trả của Khoản vay QA, hạn/ }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận đã trả', exact: true })).toBeVisible();
  expect((await ledger()).loans[0].paidPeriods).toBe(0);
  expect(
    (
      await context.request.put(base + '/repayments/' + loanId + '/payments/1', {
        data: { paid: true },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole('button', { name: 'Xác nhận đã trả', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ dấu đã trả', exact: true })).toBeVisible();
  expect((await ledger()).upcomingTotal).toBe(0);
  expect((await ledger()).loans[0].paidPeriods).toBe(1);
  await page.goto('/loans');
  await expect(page.getByText('Kỳ trả gần nhất', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: input.title, exact: true }).click();
  await expect(page.getByText('Đã xác nhận 1/12 kỳ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở sổ trả nợ' }).click();
  await expect(page).toHaveURL(/\/repayments$/);
  await expect(page.getByRole('heading', { name: input.title })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bỏ dấu đã trả', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: info.outputPath('repayments-1440.png'), fullPage: true });
  await page.getByRole('button', { name: 'Bỏ dấu đã trả', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận bỏ đánh dấu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ dấu đã trả', exact: true })).toHaveCount(0);
  expect((await ledger()).loans[0].paidPeriods).toBe(0);
  expect((await ledger()).upcomingTotal).toBe(result.firstPayment);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home');
  const nextPayment = page.getByRole('button', { name: /Kỳ thanh toán sắp tới/ }).filter({
    hasText: input.title,
  });
  await expect(nextPayment).toBeVisible();
  await nextPayment.click();
  await expect(page).toHaveURL(/\/repayments$/);

  expect((await createLegacyAccount(request, identity())).ok()).toBe(true);
  const foreign = await request.post(base + '/repayments', { data: input });
  expect(foreign.status()).toBe(404);
  expect(
    (
      await request.put(base + '/repayments/' + loanId + '/payments/1', {
        data: { paid: true, confirmed: true },
      })
    ).status(),
  ).toBe(404);
  expect((await (await request.get(base + '/repayments')).json()).loans).toEqual([]);

  const later = new Date(today + 'T00:00:00Z');
  later.setUTCDate(later.getUTCDate() + 2);
  const another = await context.request.post(base + '/simulations', {
    data: {
      requestId: randomUUID(),
      productId: 'personal-flex',
      input: {
        principal: 15000000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: later.toISOString().slice(0, 10),
      },
    },
  });
  expect(another.ok()).toBe(true);
  expect(
    (
      await context.request.post(base + '/repayments', {
        data: {
          simulationId: (await another.json()).id,
          title: 'Khoản thứ hai',
          confirmed: true,
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto('/loans');
  await expect(page.getByText('Đến hạn hôm nay', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Khoản thứ hai', exact: true }).click();
  await expect(page.getByText(/Tiền gốc:.*Tiền lãi:/)).toBeVisible();
  await page.getByRole('tab', { name: 'Hoàn thành' }).click();
  await expect(page.getByText('Chưa có khoản xác nhận đủ kỳ.')).toBeVisible();
  await page.getByRole('tab', { name: 'Đang trả' }).click();
  await expect(page.getByRole('button', { name: 'Khoản thứ hai', exact: true })).toBeVisible();
});
