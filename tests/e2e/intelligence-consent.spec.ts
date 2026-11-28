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

  const rows: Record<string, unknown>[] = [];
  await page.route('**/api/intelligence/history', (route) => route.fulfill({ json: rows }));
  await page.route('**/api/intelligence/stream', (route) => {
    const { prompt, requestedProvider, externalConsent } = route.request().postDataJSON();
    const provider = externalConsent ? 'fallback' : 'mock';
    const answer = 'Kết quả dùng bộ phân tích cục bộ.';
    const id = randomUUID();
    rows.push({
      id,
      prompt,
      answer,
      provider,
      createdAt: new Date().toISOString(),
      simulationId: null,
      blocks: [],
    });
    expect(requestedProvider).toBe(externalConsent ? 'anthropic' : 'mock');
    const events = [
      { type: 'meta', provider },
      { type: 'delta', text: answer },
      { type: 'done', turnId: id },
    ];
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: events.map((event) => 'data: ' + JSON.stringify(event) + '\n\n').join(''),
    });
  });
  async function send(prompt: string, name: string, externalConsent: boolean) {
    await page.getByRole('textbox', { name: 'Bạn đang cân nhắc khoản vay nào?' }).fill(prompt);
    const sent = page.waitForRequest('**/api/intelligence/stream');
    await page.getByRole('button', { name, exact: true }).click();
    expect((await sent).postDataJSON().externalConsent).toBe(externalConsent);
    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await send('Tôi muốn vay 20 triệu.', 'Gửi tới Claude', true);
  await expect(page.getByText('AI lỗi · dùng cục bộ')).toBeVisible();
  await page.reload();
  await send('Thu nhập là 12 triệu.', 'Gửi tới Claude', true);
  await page.getByRole('button', { name: 'Dữ liệu và chế độ xử lý' }).first().click();
  await expect(consent).toBeChecked();
  await consent.click();
  await expect(consent).not.toBeChecked();
  await page.getByRole('button', { name: 'Đóng' }).click();
  await send('Thu nhập của tôi là bao nhiêu?', 'Gửi', false);
});
