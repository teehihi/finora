import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

test.use({ hasTouch: true });

test('Fin owns a single toolbar, opens peer tabs, and keeps the unsent prompt', async ({
  page,
  context,
}, info) => {
  const connected = await createLegacyAccount(context.request, {
    name: 'Fin Navigation QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(connected.ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/home');
  const fin = page.getByRole('tab', { name: 'Finora AI', exact: true });
  await fin.click();
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quay lại', exact: true })).toHaveCount(0);
  await expect(page.getByText('Cục bộ · mặc định')).toHaveCount(0);
  const bar = page.getByTestId('fin-composer');
  await expect(bar).toHaveCount(1);
  const tabs = bar.getByRole('button', { name: 'Các tab', exact: true });
  const input = bar.getByRole('textbox');
  const tools = bar.getByRole('button', { name: 'Nguồn và công cụ' });
  const picker = page.getByTestId('fin-tab-picker');
  await expect(tools).toBeVisible();
  const send = bar.getByRole('button', { name: 'Gửi', exact: true });
  const checkAligned = async (withGrid = true) => {
    const buttons = await Promise.all(
      (withGrid ? [tabs, tools, send] : [tools, send]).map((button) => button.boundingBox()),
    );
    const centers = buttons.map((box) => box!.y + box!.height * 0.5);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(1);
    const frame = (await bar.boundingBox())!;
    for (const box of buttons) {
      expect(frame.y + frame.height - box!.y - box!.height).toBeCloseTo(5, 0);
      expect(box!.x).toBeGreaterThanOrEqual(frame.x + 4);
      expect(box!.x + box!.width).toBeLessThanOrEqual(frame.x + frame.width - 4);
    }
  };
  await checkAligned();
  const singleLine = (await bar.boundingBox())!;
  await expect(send).toBeDisabled();
  await expect(send.locator('svg')).toBeVisible();
  expect(singleLine.height).toBeLessThanOrEqual(55);
  expect((await tools.boundingBox())!.width).toBe(44);
  expect((await send.boundingBox())!.width).toBe(44);
  await expect(tools.getByTestId('fin-button-art')).toHaveCSS('width', '23px');
  await expect(send.getByTestId('fin-button-art')).toHaveCSS('width', '36px');
  await expect(input).toHaveAttribute('placeholder', 'Hỏi Fin…');
  await page.screenshot({ path: info.outputPath('fin-single-toolbar.png') });
  await tabs.click();
  await expect(picker).toBeVisible();
  const menuIconBoxes = await Promise.all(
    ['Tổng quan', 'Khám phá', 'Khoản vay', 'Hồ sơ'].map((name) =>
      picker.getByRole('button', { name, exact: true }).locator('svg').boundingBox(),
    ),
  );
  const iconColumns = menuIconBoxes.map((box) => box!.x);
  expect(Math.max(...iconColumns) - Math.min(...iconColumns)).toBeLessThan(1);
  await page.screenshot({ path: info.outputPath('fin-tabs-popover-empty.png') });
  const emptyInputFrame = (await input.boundingBox())!;
  await input.fill('Dòng đầu.\nDòng thứ hai.\nDòng cuối.');
  await expect(tabs).toHaveCount(0);
  await expect(picker).toHaveCount(0);
  expect((await input.boundingBox())!.width).toBeGreaterThan(emptyInputFrame.width + 40);
  await expect(send).toBeEnabled();
  await expect(send.locator('svg')).toBeVisible();
  await expect
    .poll(async () => (await bar.boundingBox())!.height)
    .toBeGreaterThan(singleLine.height + 20);
  await checkAligned(false);
  await page.screenshot({ path: info.outputPath('fin-composer-typed.png') });
  await input.fill('Ok');
  await expect
    .poll(async () => (await bar.boundingBox())!.height)
    .toBeCloseTo(singleLine.height, 0);
  await input.fill('  ');
  await expect(tabs).toBeVisible();
  await expect(send).toBeDisabled();
  await input.clear();
  await checkAligned();
  await tabs.click();
  await expect(tabs).toHaveAttribute('aria-expanded', 'true');
  for (const name of ['Tổng quan', 'Khám phá', 'Khoản vay', 'Hồ sơ']) {
    await expect(picker.getByRole('button', { name, exact: true })).toBeVisible();
  }
  const popupBox = await picker.boundingBox();
  const barBox = await bar.boundingBox();
  expect(popupBox!.y + popupBox!.height).toBeLessThanOrEqual(barBox!.y);
  const anchor = (await tabs.boundingBox())!;
  const tail = picker.getByTestId('fin-tab-tail');
  await expect(tail).toBeVisible();
  const tip = (await tail.boundingBox())!;
  expect(tip.x + tip.width / 2).toBeCloseTo(anchor.x + anchor.width / 2, 0);
  expect(Math.abs(tip.y + tip.height - barBox!.y)).toBeLessThan(7);
  await expect(picker).toHaveCSS('width', '184px');
  await page.screenshot({ path: info.outputPath('fin-tabs-popover.png') });
  await tabs.click();
  await expect(picker).toHaveCount(0);
  await tabs.click();
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await input.focus();
  await page.setViewportSize({ width: 390, height: 550 });
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await expect(bar.getByRole('button', { name: 'Gửi', exact: true })).toBeVisible();
  await tabs.click();
  await picker.getByRole('button', { name: 'Hồ sơ', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await fin.click();
  await expect(input).toHaveValue('');
  await input.fill('Bản nháp mua xe, chưa gửi');
  await expect(tabs).toHaveCount(0);
  await input.blur();
  const touch = await context.newCDPSession(page);
  const swipe = async (x0: number) => {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: x0, y: 170 }],
    });
    for (const dx of [20, 42, 67, 90, 110]) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + dx, y: 171 }],
      });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(125);
  await expect(page).toHaveURL(/\/assistant$/);
  await swipe(6);
  await expect(page).toHaveURL(/\/profile$/);
  await touch.detach();
  await fin.click();
  await expect(input).toHaveValue('Bản nháp mua xe, chưa gửi');

  await input.fill('Ok');
  await expect.poll(async () => (await input.boundingBox())!.height).toBeCloseTo(44, 0);
  const shortFrame = (await bar.boundingBox())!;
  const longPrompt = 'Mình đang cân nhắc vay mua xe để đi làm, muốn xem kỳ trả và tổng chi phí. '
    .repeat(8)
    .trim();
  await input.fill(longPrompt);
  await input.press('End');
  await expect
    .poll(async () => (await bar.boundingBox())!.height)
    .toBeGreaterThan(shortFrame.height + 35);
  const tallFrame = (await bar.boundingBox())!;
  expect(tallFrame.height).toBeLessThanOrEqual(146);
  expect(
    Math.abs(tallFrame.y + tallFrame.height - (shortFrame.y + shortFrame.height)),
  ).toBeLessThan(2);
  expect(await input.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await checkAligned(false);
  await expect(tabs).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('fin-composer-long-prompt.png') });
  const request = page.waitForRequest(
    (req) =>
      req.method() === 'POST' &&
      req.url().includes('/api/intelligence/') &&
      !!req.postData()?.includes('tổng chi phí'),
  );
  await send.click();
  await expect(input).toHaveValue('');
  await expect(tabs).toBeVisible();
  await expect
    .poll(async () => (await bar.boundingBox())!.height)
    .toBeCloseTo(shortFrame.height, 0);
  expect((await request).postDataJSON().prompt).toBe(longPrompt);
});
