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

  const repeated = await context.request.post(base + '/repayments', { data: input });
  expect((await repeated.json()).id).toBe(loanId);
  expect((await ledger()).loans).toHaveLength(1);
  await page.getByRole('button', { name: 'Đánh dấu đã trả', exact: true }).first().click();
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
  await expect(page.getByText('Đã xác nhận 1/12 kỳ', { exact: true })).toBeVisible();
  expect((await ledger()).upcomingTotal).toBe(0);
  await page.reload();
  await expect(page.getByText('Đã xác nhận 1/12 kỳ', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: info.outputPath('repayments-1440.png'), fullPage: true });
  await page.getByRole('button', { name: 'Bỏ dấu đã trả', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận bỏ đánh dấu', exact: true }).click();
  await expect(page.getByText('Đã xác nhận 0/12 kỳ', { exact: true })).toBeVisible();
  expect((await ledger()).upcomingTotal).toBe(result.firstPayment);

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
});
