import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://localhost:3000';
const owner = () => ({
  name: 'Personal Simulator QA',
  email: randomUUID() + '@example.test',
  password: randomUUID(),
});
const input = {
  principal: 12_000_000,
  months: 12,
  annualRate: 12,
  method: 'equalPrincipal',
  firstDue: '2027-01-31',
  fee: null,
};

test('personal simulator never inherits public advertised terms and saves only after confirmation', async ({
  page,
  context,
  request,
}, info) => {
  const endpoint = api + '/api/simulations/custom';
  const requestId = randomUUID();
  expect(
    (await request.post(endpoint, { data: { requestId, input, confirmed: true } })).status(),
  ).toBe(401);
  expect((await createLegacyAccount(context.request, owner())).ok()).toBeTruthy();
  expect(
    (
      await context.request.post(endpoint, { data: { requestId, input, confirmed: false } })
    ).status(),
  ).toBe(400);

  const previewWrites: string[] = [];
  const checkForPreviewWrite = (r: import('@playwright/test').Request) => {
    if (r.method() === 'POST' && r.url().startsWith(api + '/api/simulations')) {
      previewWrites.push(r.url());
    }
  };
  page.on('request', checkForPreviewWrite);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');
  const seed = page.getByRole('button', { name: 'Xem nguồn và điều kiện: Vay tiền mặt online' });
  await seed.click();
  await page.getByRole('button', { name: 'Mô phỏng từ điều khoản của tôi' }).click();
  await expect(page).toHaveURL(/\/simulate\/custom$/);
  await expect(page.getByRole('heading', { name: 'Mô phỏng khoản vay của bạn' })).toBeVisible();
  const principal = page.getByLabel('Số tiền vay', { exact: true });
  const rate = page.getByLabel('Lãi suất năm', { exact: true });
  await expect(principal).toHaveValue('');
  await expect(rate).toHaveValue('');
  await expect(page.getByRole('radio', { name: 'Gốc đều, dư nợ giảm dần' })).not.toBeChecked();
  await principal.fill('12.000.000');
  await rate.fill('12');
  await page.getByLabel('Kỳ hạn', { exact: true }).fill('12');
  await page.getByLabel('Ngày trả kỳ đầu (YYYY-MM-DD)', { exact: true }).fill(input.firstDue);
  await page.getByRole('radio', { name: 'Gốc đều, dư nợ giảm dần' }).click();
  await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
  const resultHeading = page.getByRole('heading', { name: 'Chi tiết trả nợ' });
  await expect(resultHeading).toBeVisible();
  await expect
    .poll(async () => {
      const box = await resultHeading.boundingBox();
      return !!box && box.y >= 45 && box.y + box.height < 760;
    })
    .toBe(true);
  await expect(page.getByText('Phí chưa xác định.', { exact: false })).toBeVisible();
  await expect(page.getByText(/1\.120\.000/).last()).toBeVisible();
  await expect(page.getByText(/780\.000/).first()).toBeVisible();
  if (process.env.FINORA_VISUAL_DISCOVERY === '1') {
    await page.getByRole('heading', { name: 'Chi tiết trả nợ' }).scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath('personal-simulation-390.png'),
      animations: 'disabled',
    });
  }

  await page.getByRole('button', { name: 'Lưu bản mô phỏng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lưu bản mô phỏng?' })).toBeVisible();
  const savedBefore = await context.request.get(api + '/api/simulations');
  expect(await savedBefore.json()).toEqual([]);
  expect(previewWrites).toEqual([]);
  page.off('request', checkForPreviewWrite);
  const saving = page.waitForResponse(
    (r) => r.url() === endpoint && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Xác nhận lưu', exact: true }).click();
  const response = await saving;
  expect(response.ok(), await response.text()).toBeTruthy();
  const { id, result, product } = await response.json();
  expect(result).toMatchObject({ firstPayment: 1_120_000, interest: 780_000, total: null });
  expect(product.source).toBe('FINORA_USER_SCENARIO');
  await expect(page).toHaveURL(new RegExp('/saved/' + id + '$'));
  await expect(page.getByRole('heading', { name: 'Chi tiết trả nợ' })).toBeVisible();
  const retry = await context.request.post(endpoint, { data: response.request().postDataJSON() });
  expect(retry.ok()).toBeTruthy();
  expect((await retry.json()).id).toBe(id);
  expect((await (await context.request.get(api + '/api/repayments')).json()).loans).toHaveLength(0);
  expect((await createLegacyAccount(request, owner())).ok()).toBeTruthy();
  expect((await request.get(api + '/api/simulations/' + id)).status()).toBe(404);
});

test('sample comparison updates only for a shared amount and term with no total-cost rank when fees are missing', async ({
  page,
  context,
}, info) => {
  expect((await createLegacyAccount(context.request, owner())).ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore?mode=sample&intent=compare');
  await expect(
    page.getByText('Chọn hai sản phẩm để tính với cùng số tiền và kỳ hạn.'),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Chi tiêu linh hoạt' }).click();
  await page.getByRole('checkbox', { name: 'Chọn so sánh: Đồng hành học tập' }).click();
  await page.getByRole('button', { name: 'So sánh điều kiện', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cùng số tiền, cùng kỳ hạn' })).toBeVisible();
  await expect(
    page.getByText('Ít nhất một bên chưa rõ phí. Không xếp hạng tổng chi phí.'),
  ).toBeVisible();

  const amount = page.getByLabel('Số tiền vay', { exact: true });
  const months = page.getByLabel('Kỳ hạn', { exact: true });
  await months.fill('6');
  await expect(page.getByRole('alert')).toHaveText(
    'Nhập số tiền và kỳ hạn trong khoảng chung để tính.',
  );
  await months.fill('24');
  await amount.fill('25000000');
  if (process.env.FINORA_VISUAL_DISCOVERY === '1') {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath('normalized-comparison-390.png'),
      animations: 'disabled',
    });
  }
  await page.getByRole('button', { name: 'Mô phỏng A', exact: true }).click();
  await expect(page).toHaveURL(/\/simulate\/personal-flex\?/);
  await expect(page.getByLabel('Số tiền vay', { exact: true })).toHaveValue('25000000');
  await expect(page.getByLabel('Kỳ hạn', { exact: true })).toHaveValue('24');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
