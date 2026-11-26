import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createLegacyAccount } from './legacy-fixture';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });

test('the browser dock supports release navigation, cancellation, and normal activation', async ({
  page,
  context,
}) => {
  const signup = await createLegacyAccount(context.request, {
    email: 'dock-' + randomUUID() + '@example.test',
    name: 'Dock QA',
    password: randomUUID(),
  });
  expect(signup.ok()).toBeTruthy();
  await page.goto('/profile');
  const profile = page.getByRole('tab', { name: 'Hồ sơ', exact: true });
  const loans = page.getByRole('tab', { name: 'Khoản vay', exact: true });
  const ai = page.getByRole('tab', { name: 'Finora AI', exact: true });
  const center = async (target: typeof profile) => {
    const box = await target.boundingBox();
    if (!box) throw new Error('Dock tab is not visible');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  const from = await center(profile);
  const to = await center(loans);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 7 });
  await expect(page).toHaveURL(/\/profile$/);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/loans$/);
  await expect(loans).toHaveAttribute('aria-selected', 'true');

  await profile.click();
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  const cdp = await context.newCDPSession(page);
  async function touchDrag(cancel: boolean) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let step = 1; step <= 7; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: from.x + ((to.x - from.x) * step) / 7, y: from.y }],
      });
    }
    await expect(page).toHaveURL(/\/profile$/);
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
  }
  await touchDrag(true);
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  await touchDrag(false);
  await expect(page).toHaveURL(/\/loans$/);
  await expect(loans).toHaveAttribute('aria-selected', 'true');
  await cdp.detach();

  await ai.focus();
  await ai.press('Enter');
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(ai).toHaveAttribute('aria-selected', 'true');
});
