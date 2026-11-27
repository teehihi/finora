import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('chat proposes an owned profile update and writes only after explicit confirmation', async ({
  page,
}) => {
  const signedUp = await createLegacyAccount(page.request, {
    name: 'Synthetic profile chat QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(signedUp.ok(), await signedUp.text()).toBe(true);
  const prompt =
    'Cập nhật hồ sơ của tôi: thu nhập 15 triệu, chi phí sinh hoạt 8 triệu, đang trả nợ 1 triệu.';
  const before = (await (await page.request.get('http://localhost:3000/api/account')).json()) as {
    profile: unknown;
  };
  expect(before.profile).toBeNull();
  const turn = await page.request.post('http://localhost:3000/api/intelligence/stream', {
    data: { requestId: randomUUID(), prompt, locale: 'vi-VN', externalConsent: false },
  });
  expect(turn.ok(), await turn.text()).toBe(true);
  const events = (await turn.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)) as { type: string; blocks?: unknown[] });
  expect(events.find((event) => event.type === 'structured')?.blocks).toContainEqual({
    kind: 'profile_update',
    income: 15_000_000,
    expenses: 8_000_000,
    debt: 1_000_000,
  });
  expect(
    (await (await page.request.get('http://localhost:3000/api/account')).json()).profile,
  ).toBeNull();
  await page.goto('/assistant');
  if (process.env.FINORA_VISUAL_QA === '1') {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Cập nhật hồ sơ', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/phase1-profile-phone.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'test-results/phase1-profile-desktop.png', fullPage: true });
    const dark = await page.request.put('http://localhost:3000/api/preferences', {
      data: { locale: 'vi-VN', appearance: 'dark' },
    });
    expect(dark.ok(), await dark.text()).toBe(true);
    await page.reload();
    await expect(page.getByText('Kiểm tra thông tin hồ sơ')).toBeVisible();
    await page.screenshot({ path: 'test-results/phase1-profile-dark.png', fullPage: true });
  }
  await page.getByRole('button', { name: 'Cập nhật hồ sơ', exact: true }).click();
  expect(
    (await (await page.request.get('http://localhost:3000/api/account')).json()).profile,
  ).toBeNull();
  await page.getByRole('button', { name: 'Xác nhận cập nhật hồ sơ' }).click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get('http://localhost:3000/api/account')).json()).profile,
    )
    .toEqual({ income: 15_000_000, expenses: 8_000_000, debt: 1_000_000 });
});
