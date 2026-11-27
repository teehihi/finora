import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';
import { syntheticLoanOfferPdf } from '../../apps/app/src/features/documents/fixture';

test('chat reviews an attached owned document without exposing another user document', async ({
  page,
  request,
}) => {
  for (const [index, client] of [page.request, request].entries()) {
    const signedUp = await createLegacyAccount(client, {
      name: 'Synthetic document chat ' + index,
      email: randomUUID() + '@example.test',
      password: randomUUID(),
    });
    expect(signedUp.ok(), await signedUp.text()).toBe(true);
  }
  const upload = await page.request.post('http://localhost:3000/api/document-analysis', {
    headers: { 'Content-Type': 'application/pdf', 'x-finora-synthetic': '1' },
    data: Buffer.from(syntheticLoanOfferPdf()),
  });
  expect(upload.ok(), await upload.text()).toBe(true);
  const { id } = (await upload.json()) as { id: string };
  const body = {
    requestId: randomUUID(),
    prompt: 'Help me review the terms in this attached document.',
    locale: 'en-US',
    documentId: id,
    externalConsent: false,
  };
  const own = await page.request.post('http://localhost:3000/api/intelligence/stream', {
    data: body,
  });
  expect(own.ok(), await own.text()).toBe(true);
  const events = (await own.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map(
      (line) =>
        JSON.parse(line.slice(6)) as {
          type: string;
          blocks?: { kind: string; documentId?: string }[];
        },
    );
  expect(events.find((event) => event.type === 'structured')?.blocks).toContainEqual(
    expect.objectContaining({ kind: 'document_review', documentId: id }),
  );
  await page.goto(`/documents/${id}`);
  await page.getByRole('button', { name: 'Hỏi Fin về tài liệu này' }).click();
  await expect(page.getByText('Tài liệu riêng tư đang tham chiếu')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveValue(
    'Giúp tôi rà soát các điều khoản trong tài liệu này.',
  );
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByText('Rà soát tài liệu', { exact: true })).toBeVisible();
  const foreign = await request.post('http://localhost:3000/api/intelligence/stream', {
    data: { ...body, requestId: randomUUID() },
  });
  expect(foreign.status()).toBe(404);
});
