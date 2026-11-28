import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('Claude availability exposes per-message external consent in the privacy panel', async ({
  page,
  context,
}, testInfo) => {
  const created = await createLegacyAccount(context.request, {
    name: 'Synthetic consent QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(created.ok(), await created.text()).toBe(true);
  await page.route('**/api/intelligence/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ provider: 'anthropic' }),
    }),
  );
  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Dùng AI bên ngoài cho câu này' }).click();
  const consent = page.getByRole('switch', { name: 'Cho phép xử lý bên ngoài' });
  await expect(consent).toBeVisible();
  await expect(consent).not.toBeChecked();
  await consent.click();
  await expect(consent).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('claude-consent-desktop.png') });
  await page.getByRole('button', { name: 'Đóng' }).click();

  await page.route('**/api/intelligence/stream', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"meta","provider":"fallback"}\n\ndata: {"type":"delta","text":"Kết quả dùng bộ phân tích cục bộ."}\n\ndata: {"type":"done"}\n\n',
    }),
  );
  await page
    .getByRole('textbox', { name: 'Bạn đang cân nhắc khoản vay nào?' })
    .fill('I would like to explore a loan.');
  const sent = page.waitForRequest('**/api/intelligence/stream');
  await page.getByRole('button', { name: 'Gửi' }).click();
  expect((await sent).postDataJSON().externalConsent).toBe(true);
  await expect(page.getByText('AI lỗi · dùng cục bộ')).toBeVisible();
});
