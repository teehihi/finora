import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { syntheticLoanOfferPdf } from '../../apps/app/src/features/documents/fixture';

test('private PDF yields evidence, permits reviewed values, saves and deletes independently', async ({
  page,
  request,
}, info) => {
  const api = 'http://localhost:3000/api';
  const headers = { Origin: 'http://localhost:8081' };
  // Stay within the inherited credential safety window when specs share loopback.
  for (const [index, ctx] of [page.request, request].entries()) {
    const signup = await createLegacyAccount(ctx, {
      email: `document-${randomUUID()}@example.test`,
      name: 'Synthetic ' + index,
      password: randomUUID(),
    });
    expect(signup.ok()).toBeTruthy();
  }

  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: 'Đọc đề nghị vay' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('document-intake.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('document-intake-mobile.png') });
  const openPicker = page.getByRole('button', { name: 'Chọn PDF hoặc ảnh' });
  const canceledPicker = page.waitForEvent('filechooser');
  await openPicker.click();
  await (await canceledPicker).element().dispatchEvent('cancel');
  await expect(openPicker).toBeEnabled();
  await expect(page.getByText('Đang đọc tài liệu của bạn…')).toHaveCount(0);

  const unsupportedPicker = page.waitForEvent('filechooser');
  await openPicker.click();
  await (
    await unsupportedPicker
  ).setFiles({
    name: 'unsupported.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic unsupported file'),
  });
  await expect(page.getByText('Chọn một tệp PDF, JPEG hoặc PNG.')).toBeVisible();
  await expect(openPicker).toBeEnabled();

  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await page.route('**/api/document-analysis', async (route) => {
    if (route.request().method() === 'POST') await uploadGate;
    await route.continue();
  });
  const filechooser = page.waitForEvent('filechooser');
  await openPicker.click();
  await (
    await filechooser
  ).setFiles({
    name: 'synthetic-finora-offer.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(syntheticLoanOfferPdf()),
  });
  try {
    await expect(page.getByText('Đang đọc tài liệu của bạn…')).toBeVisible();
    await expect(openPicker).toBeDisabled();
  } finally {
    releaseUpload();
  }
  await expect(page.getByRole('heading', { name: 'Rà soát đề nghị vay' })).toBeVisible();
  await page.unroute('**/api/document-analysis');
  await page.screenshot({ path: info.outputPath('document-review-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 960 });
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const endpoint = api + '/document-analysis/' + id;
  const own = await page.request.get(endpoint);
  expect(own.ok()).toBeTruthy();
  const evidence = await own.json();
  expect(evidence.fields.principal.value).toBe(30_000_000);
  expect(evidence.fields.principal.sources[0].page).toBe(1);
  expect(evidence.fields.insuranceFee.value).toBe(null);
  expect((await request.get(endpoint)).status()).toBe(404);
  expect((await request.get(endpoint + '/file')).status()).toBe(404);
  expect((await request.get(endpoint + '/pages/1')).status()).toBe(404);
  expect((await request.delete(endpoint, { headers })).status()).toBe(404);
  const download = await page.request.get(endpoint + '/file');
  expect(download.headers()['content-disposition']).toContain('attachment;');
  expect(download.headers()['cache-control']).toBe('no-store');
  const renderedPage = await page.request.get(endpoint + '/pages/1');
  expect(renderedPage.ok()).toBeTruthy();
  expect(renderedPage.headers()['content-type']).toContain('image/png');
  expect(renderedPage.headers()['cache-control']).toContain('no-store');

  const foreign = await request.post(endpoint + '/preview', {
    headers,
    data: {
      confirmed: true,
      input: {
        principal: 20_000_000,
        annualRate: 12.5,
        fee: null,
        months: 18,
        firstDue: '2027-01-15',
        method: 'annuity',
      },
    },
  });
  expect(foreign.status()).toBe(404);
  if (!(await page.getByText(/Trang 1:.*Principal/).isVisible()))
    await page.getByRole('button', { name: 'Xem giá trị và trích dẫn' }).click();
  await expect(page.getByText(/Trang 1:.*Principal/)).toBeVisible();
  const insuranceRow = page.getByText('Phí bảo hiểm', { exact: true }).locator('../..');
  await insuranceRow.getByRole('button', { name: 'Sửa và xác nhận điều khoản' }).click();
  await insuranceRow.getByRole('textbox', { name: 'Phí bảo hiểm' }).fill('120000');
  await insuranceRow.getByRole('button', { name: 'Lưu điều khoản đã đối chiếu' }).click();
  await expect(
    insuranceRow.getByText('Không hiểu giá trị hoặc đơn vị. Kiểm tra rồi thử lại.'),
  ).toBeVisible();
  await insuranceRow.getByRole('textbox', { name: 'Phí bảo hiểm' }).fill('120.000 VND');
  await insuranceRow.getByRole('button', { name: 'Lưu điều khoản đã đối chiếu' }).click();
  await expect(insuranceRow.getByText(/Bạn đã xác nhận.*120.000 VND/)).toBeVisible();
  await insuranceRow.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('document-corrected-term.png') });
  const confirmed = await (await page.request.get(endpoint)).json();
  expect(confirmed.fields.insuranceFee.value).toBeNull();
  expect(confirmed.confirmedTerms.insuranceFee).toMatchObject({ value: 120_000, unit: 'VND' });
  expect(
    (
      await request.put(endpoint + '/terms/insuranceFee', {
        headers,
        data: { rawValue: '0 VND' },
      })
    ).status(),
  ).toBe(404);
  await page.reload();
  await page.getByRole('button', { name: 'Xem giá trị và trích dẫn' }).click();
  await expect(page.getByText(/Bạn đã xác nhận.*120.000 VND/)).toBeVisible();
  await page.getByRole('button', { name: 'So với sản phẩm đã công bố' }).click();
  await page.getByRole('radio', { name: /Home Credit Việt Nam/ }).click();
  await expect(page.getByText('Chưa đủ dữ liệu để đối chiếu').first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('document-comparison-desktop.png') });
  await page.getByRole('button', { name: 'Xem trang PDF' }).click();
  await expect(page.getByRole('dialog', { name: 'Trang PDF riêng tư' })).toBeVisible();
  await expect(page.getByLabel('Trang PDF gốc')).toBeVisible();
  expect((await page.getByLabel('Trang PDF gốc').boundingBox())?.height).toBeGreaterThan(400);
  await page.screenshot({ path: info.outputPath('document-pdf-page-desktop.png') });
  await page
    .getByRole('dialog', { name: 'Trang PDF riêng tư' })
    .getByRole('button', { name: /Đóng|Close/ })
    .click();
  await expect(page.getByLabel('Tiền gốc (VND)')).toHaveValue('30000000');
  await page.getByLabel('Tiền gốc (VND)').fill('26,000.000');
  await page.getByRole('button', { name: 'Xác nhận và tính lại' }).click();
  await expect(page.getByText('Nhập tiền gốc lớn hơn 0 và không quá 1.000 tỷ ₫.')).toBeVisible();
  await page.getByLabel('Tiền gốc (VND)').fill('26.000.000');
  await page.getByLabel('Ngày trả kỳ đầu').fill('15/01/2027');
  await page.getByLabel('Tổng phí (VND, nếu biết)').fill('');
  await page.getByRole('button', { name: 'Xác nhận và tính lại' }).click();
  await expect(
    page.getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' }),
  ).toBeVisible();
  await page
    .getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('document-confirmed-result.png') });
  await page.getByRole('button', { name: 'Sửa thông số' }).click();
  await expect(page.getByRole('button', { name: 'Lưu bản mô phỏng đã rà soát' })).toHaveCount(0);
  await expect(page.getByLabel('Tiền gốc (VND)')).toHaveValue('26.000.000');
  await page.getByRole('button', { name: 'Xác nhận và tính lại' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('document-confirmed-mobile.png') });
  const savedCount = async () =>
    (await (await page.request.get(api + '/simulations')).json()).length;
  const trackedCount = async () =>
    (await (await page.request.get(api + '/repayments')).json()).loans.length;
  expect(await savedCount()).toBe(0);
  await page.getByRole('button', { name: 'Mở trong Trình mô phỏng' }).click();
  await expect(page).toHaveURL(/\/simulate\/custom\?handoff=[\w-]+$/);
  await expect(page.getByText('Điều khoản đã rà soát', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Số tiền vay', { exact: true })).toHaveValue('26.000.000');
  await page.getByRole('button', { name: 'Ngày trả và phí' }).click();
  await expect(page.getByLabel('Ngày trả kỳ đầu (YYYY-MM-DD)', { exact: true })).toHaveValue(
    '2027-01-15',
  );
  await expect(page.getByLabel('Tổng phí một lần (VND)', { exact: true })).toHaveValue('');
  await page.getByLabel('Số tiền vay', { exact: true }).fill('27000000');
  expect(await savedCount()).toBe(0);
  expect(await trackedCount()).toBe(0);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page).toHaveURL(/\/documents\//);
  await expect(
    page.getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Lưu bản mô phỏng đã rà soát' }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Lưu bản mô phỏng?' });
  await expect(saveDialog.getByText(/không bắt đầu theo dõi khoản vay/i)).toBeVisible();
  expect(await savedCount()).toBe(0);
  await saveDialog.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(saveDialog).not.toBeVisible();
  expect(await savedCount()).toBe(0);
  await page.getByRole('button', { name: 'Lưu bản mô phỏng đã rà soát' }).click();
  await saveDialog.getByRole('button', { name: 'Xác nhận lưu bản mô phỏng', exact: true }).click();
  await expect(page).toHaveURL(/\/saved\//);
  expect(await trackedCount()).toBe(0);
  await expect(page.getByText('Tài liệu riêng tư đã rà soát')).toBeVisible();
  const savedUrl = page.url();
  const saved = await page.request.get(
    api + '/simulations/' + new URL(savedUrl).pathname.split('/').at(-1),
  );
  expect(saved.ok()).toBeTruthy();
  const savedEstimate = await saved.json();
  expect(savedEstimate.input.principal).toBe(26_000_000);
  expect(savedEstimate.input.firstDue).toBe('2027-01-15');
  expect(savedEstimate.result.total).toBeNull();

  await page.goto('/documents/' + id);
  await page.getByRole('button', { name: 'Xóa tài liệu' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page).toHaveURL(/\/documents$/);
  expect((await page.request.get(endpoint)).status()).toBe(404);
  expect((await page.request.get(endpoint + '/file')).status()).toBe(404);
  expect((await page.request.get(endpoint + '/pages/1')).status()).toBe(404);
  await page.goto('/documents/' + id);
  await expect(page.getByText('Tài liệu không còn khả dụng với phiên hiện tại.')).toBeVisible();
  await page.goto(savedUrl);
  await expect(page.getByText('Tài liệu riêng tư đã rà soát')).toBeVisible();
});

test('an unreadable private image can be previewed and recovered with manual terms', async ({
  page,
}) => {
  const api = 'http://localhost:3000/api';
  expect(
    (
      await createLegacyAccount(page.request, {
        email: `document-manual-${randomUUID()}@example.test`,
        name: 'Synthetic manual review',
        password: randomUUID(),
      })
    ).ok(),
  ).toBeTruthy();
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAAAAADhZOFXAAAADklEQVR4nGP4DwUMlDEA98A/wbI0QbsAAAAASUVORK5CYII=',
    'base64',
  );
  await page.goto('/documents');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn PDF hoặc ảnh' }).click();
  await (
    await chooser
  ).setFiles({ name: 'synthetic-blank.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByText('Cần nhập từ bản gốc', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem ảnh gốc', exact: true }).click();
  const original = page.getByRole('dialog', { name: 'Ảnh gốc riêng tư' });
  await expect(original.getByRole('img', { name: 'Ảnh đề nghị vay bạn đã tải lên' })).toBeVisible();
  await original.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByLabel('Tiền gốc (VND)')).toHaveValue('');
  await page.getByLabel('Tiền gốc (VND)').fill('18000000');
  await page.getByLabel('Kỳ hạn (tháng)').fill('12');
  await page.getByLabel('Lãi suất năm (%)').fill('12,3');
  await page.getByLabel('Ngày trả kỳ đầu').fill('15/01/2027');
  await page.getByRole('radio', { name: 'Trả góp đều' }).click();
  await page.getByRole('button', { name: 'Xác nhận và tính lại' }).click();
  await expect(
    page.getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' }),
  ).toBeVisible();
  expect((await (await page.request.get(api + '/simulations')).json()).length).toBe(0);
  expect((await (await page.request.get(api + '/repayments')).json()).loans).toHaveLength(0);
});

test('Vietnamese scanned image links OCR evidence to its original', async ({ page }, info) => {
  test.skip(!process.env.DOCUMENT_OCR_LANGS, 'Local OCR languages are not configured');
  expect(
    (
      await createLegacyAccount(page.request, {
        email: `document-ocr-${randomUUID()}@example.test`,
        name: 'Synthetic OCR review',
        password: randomUUID(),
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto('/documents');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn PDF hoặc ảnh' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'synthetic-vietnamese-scan.png',
    mimeType: 'image/png',
    buffer: readFileSync('apps/api/test/fixtures/vi-scan.png'),
  });
  await expect(page.getByRole('heading', { name: 'Rà soát đề nghị vay' })).toBeVisible();
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const review = await (
    await page.request.get(`http://localhost:3000/api/document-analysis/${id}`)
  ).json();
  expect(review.mode).toBe('local-ocr');
  expect(review.fields.principal.value).toBe(30_000_000);
  expect(review.fields.principal.sources[0].bbox.width).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Xem giá trị và trích dẫn' }).click();
  await page.getByRole('button', { name: 'Xem trang gốc 1' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Ảnh gốc riêng tư' })).toBeVisible();
  await expect(page.getByLabel('Ảnh đề nghị vay bạn đã tải lên')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('document-ocr-evidence-mobile.png') });
  await page
    .getByRole('dialog', { name: 'Ảnh gốc riêng tư' })
    .getByRole('button', { name: /Đóng|Close/ })
    .click();
  const preference = await page.request.put('http://localhost:3000/api/preferences', {
    headers: { Origin: 'http://localhost:8081' },
    data: { locale: 'vi-VN', appearance: 'dark' },
  });
  expect(preference.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole('button', { name: 'Xem giá trị và trích dẫn' }).click();
  await page.getByRole('button', { name: 'Xem trang gốc 1' }).first().click();
  await expect(page.getByLabel('Ảnh đề nghị vay bạn đã tải lên')).toBeVisible();
  await page.screenshot({ path: info.outputPath('document-ocr-evidence-mobile-dark.png') });
});
