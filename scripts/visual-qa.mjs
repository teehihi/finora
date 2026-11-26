import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const app = process.env.FINORA_VISUAL_APP || 'http://localhost:8081';
const api = process.env.FINORA_VISUAL_API || 'http://localhost:3000';
const out = process.env.FINORA_VISUAL_OUTPUT || '/tmp/finora-visual';
const widths = (process.env.FINORA_VISUAL_WIDTHS || '360,390,430,768,1024,1440,1920')
  .split(',')
  .map(Number);
const requested = new Set((process.env.FINORA_VISUAL_ROUTES || '').split(',').filter(Boolean));
const wants = (name) => !requested.size || requested.has(name);
const browser = await chromium.launch({
  ...(process.env.FINORA_CHROMIUM ? { executablePath: process.env.FINORA_CHROMIUM } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const context = await browser.newContext({
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const shots = [];
  const fetchApi = async (route, data, method = 'POST') => {
    const response = await context.request.fetch(api + route, {
      method,
      data,
      headers: { Origin: app },
    });
    if (!response.ok()) throw new Error(route + ' HTTP ' + response.status());
    return response.json();
  };
  const capture = async (name, target, visit) => {
    if (!wants(name)) return;
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 990 });
      await page.goto(app + target, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading').first().waitFor({ timeout: 15000 });
      if (visit) await visit(page);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
        throw new Error(name + ' horizontal overflow at ' + width + 'px');
      }
      const file = join(out, name + '-' + width + '.png');
      await page.screenshot({ path: file, animations: 'disabled' });
      shots.push(file);
    }
  };
  await mkdir(out, { recursive: true });
  await capture('welcome', '/');
  await capture('auth', '/auth');
  if (
    process.env.FINORA_VISUAL_PUBLIC_ONLY !== '1' &&
    (!requested.size || [...requested].some((name) => !['welcome', 'auth'].includes(name)))
  ) {
    const email = 'visual-' + randomUUID() + '@example.test';
    const password = randomUUID() + 'aA';
    await fetchApi('/api/auth/sign-up/email', { name: 'An', email, password });
    await fetchApi('/api/profile', { income: 20000000, expenses: 9000000, debt: 1500000 }, 'PUT');
    const products = await fetchApi('/api/catalog', undefined, 'GET');
    const product = products.find((p) => p.name === 'Chi tiêu linh hoạt') || products[0];
    if (!product) throw new Error('Seed the local catalog before visual verification');
    for (const [name, path] of [
      ['home', '/home'],
      ['explore', '/explore'],
      ['assistant', '/assistant'],
      ['loans', '/loans'],
      ['profile', '/profile'],
      ['simulator', '/simulate/' + product.id],
    ]) {
      await capture(
        name,
        path,
        name === 'simulator'
          ? async (p) => {
              await p.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
              await p.getByRole('heading', { name: 'Chi tiết trả nợ' }).waitFor();
            }
          : undefined,
      );
    }
    if (wants('schedule')) {
      if (!wants('simulator')) {
        await page.goto(app + '/simulate/' + product.id);
        await page.getByRole('button', { name: 'Tính lịch trả nợ' }).click();
      }
      await page.getByRole('button', { name: 'Lưu bản mô phỏng' }).click();
      await page.waitForURL(/\/saved\//);
      await capture('schedule', new URL(page.url()).pathname);
    }
  }
  console.log(JSON.stringify(shots));
} finally {
  await browser.close();
}
