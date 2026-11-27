import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test('confirms a selected avatar, restores it in another session, and isolates owners', async ({
  browser,
  context,
  page,
  request,
}, info) => {
  const name = 'Minh An';
  const email = 'avatar-' + randomUUID().slice(0, 6) + '@example.test';
  const password = randomUUID();
  const api = 'http://localhost:3000/api/account/avatar';
  const headers = { Origin: 'http://localhost:8081', 'Content-Type': 'image/jpeg' };
  expect((await createLegacyAccount(context.request, { name, email, password })).ok()).toBe(true);
  expect((await request.get(api)).status()).toBe(401);
  expect((await request.put(api, { headers, data: Buffer.from('image') })).status()).toBe(401);
  expect(await (await context.request.get(api)).json()).toEqual({ dataUrl: null });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile/personal');
  const change = page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true });
  const file = resolve('apps/app/assets/scenes/workspace/profile-riverside.jpg');
  const chooser = page.waitForEvent('filechooser');
  await change.click();
  await (await chooser).setFiles(file);
  const save = page.getByRole('button', { name: 'Lưu ảnh', exact: true });
  await expect(save).toBeVisible();
  expect(await (await context.request.get(api)).json()).toEqual({ dataUrl: null });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.screenshot({ path: info.outputPath('profile-avatar-preview.png') });
  await save.click();
  await expect(page.getByTestId('account-avatar-image')).toBeVisible();
  const stored = await context.request.get(api);
  expect(stored.headers()['cache-control']).toContain('no-store');
  const avatar = await stored.json();
  expect(avatar.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.screenshot({ path: info.outputPath('profile-avatar-saved.png') });

  expect(
    (await context.request.put(api, { headers, data: Buffer.from('not a jpeg') })).status(),
  ).toBe(400);
  expect(await (await context.request.get(api)).json()).toEqual(avatar);
  await page.goto('/profile');
  await expect(page.getByTestId('account-avatar-image')).toBeVisible();
  await page.screenshot({ path: info.outputPath('profile-account-with-avatar.png') });

  const other = await browser.newContext();
  const device = await browser.newContext();
  try {
    expect(
      (
        await device.request.post('http://localhost:3000/api/auth/sign-in/email', {
          headers: { Origin: 'http://localhost:8081' },
          data: { email, password },
        })
      ).ok(),
    ).toBe(true);
    const devicePage = await device.newPage();
    await devicePage.goto('http://localhost:8081/profile/personal');
    await expect(devicePage.getByTestId('account-avatar-image')).toBeVisible();
    expect(await (await device.request.get(api)).json()).toEqual(avatar);

    expect(
      (
        await createLegacyAccount(other.request, {
          email: randomUUID() + '@example.test',
          name: 'Another owner',
          password: randomUUID(),
        })
      ).ok(),
    ).toBe(true);
    expect(
      await (await other.request.get(api + '?userId=' + encodeURIComponent(email))).json(),
    ).toEqual({ dataUrl: null });
  } finally {
    await Promise.all([device.close(), other.close()]);
  }
});
