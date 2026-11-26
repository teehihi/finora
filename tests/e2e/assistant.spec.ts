import { createLegacyAccount } from './legacy-fixture';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('reference a saved simulation, show sourced figures, and restore history', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = 'http://localhost:3000';
  const headers = { Origin: 'http://localhost:8081' };
  const account = await createLegacyAccount(context.request, {
    name: 'Assistant QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(account.ok(), await account.text()).toBe(true);
  const saved = await context.request.post(api + '/api/simulations', {
    headers,
    data: {
      productId: 'personal-flex',
      requestId: randomUUID(),
      input: {
        principal: 12_000_000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: '2028-01-31',
      },
    },
  });
  expect(saved.ok(), await saved.text()).toBe(true);
  const snapshot = await saved.json();
  const requestIds: string[] = [];
  await page.route('**/api/assistant/stream', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.continue();
    requestIds.push(request.postDataJSON().requestId as string);
    // Exercise the retry UI on an interrupted transport, then use the real SSE backend.
    if (requestIds.length === 1) return route.abort('failed');
    return route.continue();
  });
  await page.goto('/assistant?mode=legacy');
  await expect(page.getByRole('heading', { name: 'Cùng hiểu khoản vay' })).toBeVisible();
  await expect(page.getByText('Mô phỏng AI · Cục bộ')).toBeVisible();
  await page.getByRole('button', { name: 'Bản mô phỏng tham chiếu' }).click();
  await page.getByRole('button', { name: snapshot.product.name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp('simulationId=' + snapshot.id));
  const composer = page.getByLabel('Nhập câu hỏi của bạn');
  const prompt = 'Mô phỏng này trả bao nhiêu ở kỳ đầu?';
  await composer.fill(prompt);
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText('Chưa nhận được phản hồi đầy đủ.')).toBeVisible();
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Kết quả từ bộ máy tính', { exact: false })).toBeVisible();
  await expect(page.getByText('Tổng gồm phí', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa xác định', { exact: true })).toBeVisible();
  expect(requestIds).toHaveLength(2);
  expect(requestIds[0]).toBe(requestIds[1]);
  await page.reload();
  await expect(page.getByText(prompt, { exact: true })).toHaveCount(1);
  await expect(page.getByText(snapshot.product.name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở bản mô phỏng' }).click();
  await expect(page).toHaveURL(new RegExp('/saved/' + snapshot.id + '$'));
});
