import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://localhost:3000';

test('analyze verified assumptions, explicitly save, and revisit the repayment schedule', async ({
  page,
  context,
}, info) => {
  expect((await context.request.get(api + '/api/intelligence/history')).status()).toBe(401);
  const session = await createLegacyAccount(context.request, {
    name: 'Intelligence QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(session.ok(), await session.text()).toBe(true);
  const captures = process.env.FINORA_VISUAL_INTELLIGENCE === '1';

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/assistant');
  await expect(page).toHaveURL(/\/assistant$/);
  await expect(page.getByRole('tab', { name: 'Finora AI' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Cùng Fin tính khoản vay' })).toBeVisible();
  await expect(page.getByText('Cục bộ · mặc định')).toBeVisible();
  if (captures) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('intelligence-empty-' + width + '.png'),
        animations: 'disabled',
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }

  const question =
    'Thu nhập 15 triệu, chi phí sinh hoạt 8 triệu, đang trả nợ 1 triệu. Tôi muốn vay 50 triệu mua xe, 12 tháng hay 24 tháng?';
  await page.goto('/assistant?draftPrompt=' + encodeURIComponent(question));
  const composer = page.getByLabel('Bạn đang cân nhắc khoản vay nào?');
  await expect(composer).toHaveValue(question);
  expect(await (await context.request.get(api + '/api/intelligence/history')).json()).toEqual([]);
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByText(/mình còn cần: lãi suất năm, cách tính lãi/)).toBeVisible();
  await composer.fill('Lãi suất 12%/năm, trả góp đều. Chưa biết phí.');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const affordability = page.getByRole('heading', { name: 'Khả năng trả nợ ước tính' }).last();
  await expect(affordability).toBeVisible();
  await expect(page.getByText('6,67%', { exact: true }).last()).toBeVisible();
  const scenario = page.getByRole('heading', { name: 'Kịch bản trả nợ · 12 tháng' });
  await expect(scenario).toBeVisible();
  const alternative = page.getByRole('heading', { name: 'Kịch bản trả nợ · 24 tháng' });
  await expect(alternative).toBeVisible();
  await expect(page.getByText('Mô phỏng cục bộ', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu mô phỏng này' }).first()).toBeVisible();

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect
      .poll(async () => {
        const [left, right] = await Promise.all([
          scenario.boundingBox(),
          alternative.boundingBox(),
        ]);
        if (!left || !right) return false;
        return width === 1440
          ? left.x < right.x && Math.abs(left.y - right.y) < 4
          : Math.abs(left.x - right.x) < 4 && left.y < right.y;
      })
      .toBe(true);
    if (captures) {
      await scenario.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('intelligence-scenario-' + width + '.png'),
        animations: 'disabled',
      });
    }
  }
  await page.getByRole('button', { name: 'Xem phép tính' }).first().click();
  await expect(page.getByText('Lãi suất năm theo kịch bản', { exact: true })).toBeVisible();
  const beforeShock = await (await context.request.get(api + '/api/intelligence/history')).json();
  await page.getByRole('button', { name: 'Thử thu nhập giảm 20%' }).click();
  await expect(composer).toHaveValue('Nếu thu nhập giảm 20% thì sao?');
  expect(await (await context.request.get(api + '/api/intelligence/history')).json()).toHaveLength(
    beforeShock.length,
  );
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const stress = page.getByText('Dòng tiền còn lại khi thu nhập giảm', { exact: true }).last();
  await expect(stress).toBeVisible();
  if (captures) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page
        .getByRole('heading', { name: 'So sánh theo kỳ hạn' })
        .last()
        .scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath('intelligence-stress-' + width + '.png'),
        animations: 'disabled',
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  const afterShock = await (await context.request.get(api + '/api/intelligence/history')).json();
  expect(afterShock).toHaveLength(beforeShock.length + 1);
  const cases = afterShock.at(-1).blocks.filter((b: { kind: string }) => b.kind === 'scenario');
  expect(cases.map((b: { months: number }) => b.months)).toEqual([12, 24]);
  for (const item of cases) {
    expect(item.stressRemainingCash).toBe(3_000_000 - item.peakPayment);
    expect(item.total).toBeNull();
  }
  await page.reload();
  const save = page.getByRole('button', { name: 'Lưu mô phỏng này' }).last();
  await expect(save).toBeVisible();
  await save.click();
  await expect(
    page.getByText('Lưu các giả định và lịch trả nợ để xem lại.', { exact: false }),
  ).toBeVisible();
  expect(await (await context.request.get(api + '/api/simulations')).json()).toEqual([]);
  await page.getByRole('button', { name: 'Xác nhận lưu mô phỏng' }).click();
  await expect(page).toHaveURL(/\/saved\/[a-f0-9-]+$/i);
  await expect(page.getByText('Lịch trả nợ', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Phân tích mô phỏng này' }).click();
  await expect(page).toHaveURL(/\/intelligence\?simulationId=[a-f0-9-]+$/i);
  await expect(page.getByRole('button', { name: 'Bỏ tham chiếu' })).toBeVisible();
});
