import { test, expect, request } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test('server calculations, replay and private fixture ownership', async () => {
  // Preserve Better Auth's per-IP sign-up burst limit across E2E specs.
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  const options = {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { Origin: 'http://localhost:8081' },
  };
  const a = await request.newContext(options),
    b = await request.newContext(options);
  try {
    expect((await b.get('/api/simulations')).status()).toBe(401);
    for (const client of [a, b]) {
      const r = await client.post('/api/auth/sign-up/email', {
        data: { name: 'Sandbox', email: randomUUID() + '@example.test', password: randomUUID() },
      });
      expect(r.ok(), `Signup failed: ${r.status()} ${await r.text()}`).toBeTruthy();
    }
    const productId = 'personal-flex',
      input = {
        principal: 12000000,
        months: 12,
        annualRate: 12,
        fee: null,
        method: 'annuity',
        firstDue: '2028-01-31',
      },
      data = { productId, input, requestId: randomUUID() };
    const preview = await a.post('/api/simulations/preview', { data: { productId, input } });
    expect((await preview.json()).firstPayment).toBe(1066185);
    const first = await a.post('/api/simulations', { data });
    const saved = await first.json();
    expect(saved.result.total).toBeNull();
    const replay = await a.post('/api/simulations', { data });
    expect((await replay.json()).id).toBe(saved.id);
    expect((await b.get('/api/simulations/' + saved.id)).status()).toBe(404);
    expect((await b.get('/api/simulations')).ok()).toBeTruthy();
    expect(
      (
        await b.post('/api/assistant/stream', {
          data: {
            simulationId: saved.id,
            requestId: randomUUID(),
            prompt: 'test',
            locale: 'vi-VN',
          },
        })
      ).status(),
    ).toBe(404);
    const fixture = await a.post('/api/documents', {
      headers: { 'Content-Type': 'text/plain', 'X-Finora-Synthetic': '1' },
      data: 'Finora synthetic fixture',
    });
    expect(fixture.ok()).toBeTruthy();
    const { id } = await fixture.json();
    expect(await (await a.get('/api/documents/' + id)).text()).toBe('Finora synthetic fixture');
    expect((await b.get('/api/documents/' + id)).status()).toBe(404);
    expect((await a.post('/api/documents', { data: { bytes: 'bad' } })).status()).toBe(415);
    expect(
      (
        await a.post('/api/documents', {
          headers: { 'Content-Type': 'text/plain', 'X-Finora-Synthetic': '1' },
          data: 'x'.repeat(66000),
        })
      ).status(),
    ).toBe(413);
    expect(
      (
        await a.put('/api/profile', {
          headers: { Origin: 'https://untrusted.invalid' },
          data: { income: 10, debt: 0, expenses: 0 },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await a.dispose();
    await b.dispose();
  }
});
