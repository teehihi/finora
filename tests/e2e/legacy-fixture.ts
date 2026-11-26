import type { APIRequestContext } from '@playwright/test';

type LegacyAccount = { name: string; email: string; password: string };

// Suites share localhost. Fixture creation respects the same per-IP limit as humans
// rather than turning off the real password-auth policy while exercising it.
export async function createLegacyAccount(client: APIRequestContext, data: LegacyAccount) {
  const url = 'http://localhost:3000/api/auth/sign-up/email';
  const opts = { headers: { Origin: 'http://localhost:8081' }, data };
  let result = await client.post(url, opts);
  for (let retry = 0; retry < 2 && result.status() === 429; retry += 1) {
    const seconds = Number(result.headers()['x-retry-after'] ?? result.headers()['retry-after']);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 12) break;
    await new Promise((resolve) => setTimeout(resolve, Math.ceil(seconds * 1000) + 350));
    result = await client.post(url, opts);
  }
  return result;
}
