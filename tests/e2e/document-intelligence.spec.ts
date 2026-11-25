import { createLegacyAccount } from './legacy-fixture';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
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
  const filechooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn PDF hoặc ảnh' }).click();
  await (
    await filechooser
  ).setFiles({
    name: 'synthetic-finora-offer.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(syntheticLoanOfferPdf()),
  });
  await expect(page.getByRole('heading', { name: 'Rà soát đề nghị vay' })).toBeVisible();
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
  expect((await request.delete(endpoint, { headers })).status()).toBe(404);
  expect((await page.request.get(endpoint + '/file')).headers()['content-disposition']).toContain(
    'attachment;',
  );

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
  await expect(page.getByLabel('Tiền gốc (VND)')).toHaveValue('30000000');
  await page.getByLabel('Tiền gốc (VND)').fill('26000000');
  await page.getByLabel('Tổng phí (VND, nếu biết)').fill('');
  await page.getByRole('button', { name: 'Xác nhận và tính lại' }).click();
  await expect(
    page.getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' }),
  ).toBeVisible();
  await page
    .getByRole('heading', { name: 'Finora tính từ thông số đã xác nhận' })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('document-confirmed-result.png') });
  await page.getByRole('button', { name: 'Lưu bản mô phỏng đã rà soát' }).click();
  await expect(page).toHaveURL(/\/saved\//);
  await expect(page.getByText('Tài liệu riêng tư đã rà soát')).toBeVisible();
  const savedUrl = page.url();
  const saved = await page.request.get(
    api + '/simulations/' + new URL(savedUrl).pathname.split('/').at(-1),
  );
  expect(saved.ok()).toBeTruthy();
  expect((await saved.json()).result.total).toBeNull();

  await page.goto('/documents/' + id);
  await page.getByRole('button', { name: 'Xóa tài liệu' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(page).toHaveURL(/\/documents$/);
  expect((await page.request.get(endpoint)).status()).toBe(404);
  expect((await page.request.get(endpoint + '/file')).status()).toBe(404);
  await page.goto(savedUrl);
  await expect(page.getByText('Tài liệu riêng tư đã rà soát')).toBeVisible();
});
