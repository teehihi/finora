import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const base = 'http://localhost:3000/api';

test('keeps the latest installment visible while refreshing, then recovers in place', async ({
  context,
  page,
}, info) => {
  expect(
    (
      await createLegacyAccount(context.request, {
        name: 'Finora Visual QA',
        email: randomUUID() + '@example.test',
        password: randomUUID(),
      })
    ).ok(),
  ).toBe(true);
  const seed = await context.request.get(base + '/repayments');
  expect(seed.ok()).toBe(true);
  const { today } = await seed.json();
  await info.attach('visual-fixture', {
    body: JSON.stringify({
      today,
      name: 'Finora Visual QA',
      installment: 1066185,
      principal: 946185,
      interest: 120000,
    }),
    contentType: 'application/json',
  });
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
  const title = 'Khoản vay minh họa QA';
  expect(
    (
      await context.request.post(base + '/repayments', {
        data: { simulationId, title, confirmed: true },
      })
    ).ok(),
  ).toBe(true);

  let failure = false;
  let unblock: (() => void) | undefined;
  let gate: Promise<void> | undefined;
  const pause = () => {
    gate = new Promise<void>((resolve) => {
      unblock = resolve;
    });
  };
  const resume = () => {
    unblock?.();
    gate = undefined;
  };
  await page.route('**/api/repayments', async (route) => {
    if (gate) await gate;
    if (failure)
      await route.fulfill({
        status: 503,
        headers: {
          'access-control-allow-origin': 'http://localhost:8081',
          'access-control-allow-credentials': 'true',
        },
        json: {},
      });
    else await route.continue();
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  pause();
  await page.goto('/home');
  const skeleton = page.getByTestId('task-hero-skeleton');
  const tools = page.getByRole('heading', { name: 'Công cụ', exact: true });
  await expect(skeleton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem kỳ trả' })).toHaveCount(0);
  expect(await skeleton.evaluate((node) => getComputedStyle(node.firstElementChild!).opacity)).toBe(
    '1',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() =>
      skeleton.evaluate((node) => Number(getComputedStyle(node.firstElementChild!).opacity)),
    )
    .toBeLessThan(0.99);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => skeleton.evaluate((node) => getComputedStyle(node.firstElementChild!).opacity))
    .toBe('1');
  const toolsBefore = (await tools.boundingBox())!.y;
  await page.screenshot({ path: info.outputPath('01-loading-390.png') });
  resume();

  const checkout = page.getByRole('button', { name: 'Xem kỳ trả', exact: true });
  await expect(checkout).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const amount = await page.getByRole('heading', { name: /₫/ }).first().textContent();
  expect(amount).toBeTruthy();
  expect(Math.abs((await tools.boundingBox())!.y - toolsBefore)).toBeLessThan(8);
  await page.screenshot({ path: info.outputPath('02-home-390.png') });

  const refresh = page.getByRole('button', { name: 'Làm mới dữ liệu' });
  pause();
  await refresh.click();
  await expect(page.getByTestId('task-refresh-indicator').first()).toBeVisible();
  await expect(checkout).toBeVisible();
  await expect(
    page.getByRole('heading', { name: amount ?? '', exact: true }).first(),
  ).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  failure = true;
  resume();
  await expect(page.getByText(/Đang hiển thị dữ liệu lần gần nhất/)).toBeVisible();
  await expect(checkout).toBeVisible();
  await expect(
    page.getByRole('heading', { name: amount ?? '', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('03-refresh-error-390.png') });
  failure = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText(/Đang hiển thị dữ liệu lần gần nhất/)).toHaveCount(0);

  await checkout.click();
  await expect(page).toHaveURL(/\/repayments$/);
  await expect(page.getByRole('heading', { name: 'Chi tiết kỳ trả' })).toBeVisible();
  await expect(page.getByText('Tiền gốc', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Tiền lãi', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kỳ trả góp' })).toBeVisible();
  expect(
    (
      await page
        .getByRole('heading', { name: amount ?? '', exact: true })
        .first()
        .boundingBox()
    )?.y,
  ).toBeLessThan(165);
  const dock = page
    .getByRole('tablist')
    .filter({ has: page.getByRole('tab', { name: 'Tổng quan', exact: true }) });
  const plan = page.getByRole('button', { name: 'Xem cách chuẩn bị' });
  const planBox = await plan.boundingBox();
  expect((planBox?.y ?? 900) + (planBox?.height ?? 0)).toBeLessThan((await dock.boundingBox())!.y);
  await page.screenshot({ path: info.outputPath('04-payment-390.png') });
  await page.getByRole('button', { name: 'Xem cách chuẩn bị' }).click();
  await expect(page).toHaveURL(/\/cashflow$/);
  await page.getByRole('radio', { name: 'Thử dữ liệu mẫu' }).click();
  await expect(page.getByRole('heading', { name: /1\.200\.000/ })).toBeVisible();
  const chart = await page.getByTestId('cashflow-balance-chart').boundingBox();
  expect(chart?.y).toBeLessThan(350);
  const cashButton = await page.getByRole('button', { name: /Thử thêm tiền đầu kỳ/ }).boundingBox();
  expect((cashButton?.y ?? 900) + (cashButton?.height ?? 0)).toBeLessThan(
    (await dock.boundingBox())!.y,
  );
  await page.screenshot({ path: info.outputPath('05-cashflow-390.png') });
  const after = await (await context.request.get(base + '/repayments')).json();
  expect(after.loans[0].paidPeriods).toBe(0);
  const latest = await (await context.request.get(base + '/repayments')).json();
  expect(latest.loans[0].schedule[0].statusChangedAt).toBeNull();
});
