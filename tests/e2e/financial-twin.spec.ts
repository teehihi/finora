import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const api = 'http://localhost:3000';
const loan = {
  principal: 24_000_000,
  annualRate: 12,
  months: 12,
  method: 'annuity',
  fee: null,
  firstDue: '2026-12-31',
};
const value = (amount: number) => ({ amount, source: 'user_estimate' });
const state = {
  monthlyIncome: value(12_000_000),
  incomeStability: 'stable',
  essentialExpenses: value(5_000_000),
  discretionaryExpenses: value(1_000_000),
  existingDebtPayments: value(1_000_000),
  currentSavings: value(10_000_000),
  emergencyFund: value(8_000_000),
  events: [],
};

test('digital twin reconciles saved schedule, protects ownership, and renders the same scenario', async ({
  page,
  request,
}, info) => {
  const payload = {
    state,
    loan,
    scenarios: [
      {
        shocks: [
          { kind: 'incomeReduction', startMonth: 2, durationMonths: 3, percent: 50 },
          { kind: 'unexpectedExpense', startMonth: 2, amount: 4_000_000 },
        ],
      },
    ],
  };
  expect((await request.post(api + '/api/digital-twin/compare', { data: payload })).status()).toBe(
    401,
  );
  const invalid = await request.post(api + '/api/digital-twin/compare', {
    data: {
      ...payload,
      scenarios: [{ shocks: [{ kind: 'unemployment', startMonth: 0, durationMonths: 3 }] }],
    },
  });
  expect(invalid.status()).toBe(401);
  const account = await createLegacyAccount(page.request, {
    name: 'Synthetic twin QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(account.ok(), await account.text()).toBe(true);
  const profile = await page.request.put(api + '/api/profile', {
    data: { income: 12_000_000, expenses: 6_000_000, debt: 1_000_000 },
  });
  expect(profile.ok(), await profile.text()).toBe(true);
  const save = await page.request.post(api + '/api/simulations/custom', {
    data: { input: loan, requestId: randomUUID(), confirmed: true },
  });
  expect(save.ok(), await save.text()).toBe(true);
  const saved = (await save.json()) as {
    id: string;
    result: { schedule: { date: string; payment: number; balance: number }[] };
  };
  const url = api + '/api/simulations/' + saved.id + '/digital-twin';
  const a = await page.request.post(url, { data: { state, scenarios: payload.scenarios } });
  const b = await page.request.post(url, { data: { state, scenarios: payload.scenarios } });
  expect(a.ok(), await a.text()).toBe(true);
  const twin = (await a.json()) as {
    baseline: { months: { date: string; loanPayment: number; loanBalance: number }[] };
    alternatives: {
      firstCashShortfall: number | null;
      stressedPeriods: number;
      unknownCosts: string[];
    }[];
  };
  expect(twin).toEqual(await b.json());
  expect(twin.baseline.months.map((m) => [m.date, m.loanPayment, m.loanBalance])).toEqual(
    saved.result.schedule.map((m) => [m.date, m.payment, m.balance]),
  );
  expect(twin.alternatives[0].firstCashShortfall).toBe(2);
  expect(twin.alternatives[0].stressedPeriods).toBeGreaterThan(0);
  expect(twin.alternatives[0].unknownCosts).toContain('origination_fee');
  const unverified = await page.request.post(api + '/api/digital-twin/compare', {
    data: {
      ...payload,
      state: { ...state, monthlyIncome: { amount: 12_000_000, source: 'observed' } },
    },
  });
  expect(unverified.ok(), await unverified.text()).toBe(true);
  expect((await unverified.json()).baseline.provenance.monthlyIncome).toBe('user_estimate');
  expect(
    (
      await page.request.post(url, {
        data: {
          state,
          scenarios: [
            {
              shocks: [{ kind: 'incomeReduction', startMonth: 0, durationMonths: 3, percent: 50 }],
            },
          ],
        },
      })
    ).status(),
  ).toBe(400);

  const stream = await page.request.post(api + '/api/intelligence/stream', {
    data: {
      requestId: randomUUID(),
      locale: 'en-US',
      externalConsent: false,
      simulationId: saved.id,
      prompt:
        'What happens if I lose my job for 3 months? Essential expenses 5 million, discretionary expenses 1 million, current savings 10 million, emergency savings 8 million',
    },
  });
  expect(stream.ok(), await stream.text()).toBe(true);
  const blocks = (await stream.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)))
    .find((event) => event.type === 'structured')?.blocks as {
    kind: string;
    stressed?: { firstCashShortfall: number | null };
  }[];
  expect(
    blocks.some(
      (block) => block.kind === 'digital_twin' && block.stressed?.firstCashShortfall === 1,
    ),
  ).toBe(true);

  await page.goto('/saved/' + saved.id);
  await page.getByRole('button', { name: 'Xem dòng tiền tương lai' }).click();
  await expect(page).toHaveURL(/\/twin\//);
  await expect(page.getByRole('heading', { name: 'Dòng tiền tương lai' })).toBeVisible();
  await page.getByLabel('Chi phí thiết yếu').fill('5000000');
  await page.getByLabel('Chi tiêu tùy ý').fill('1000000');
  await page.getByLabel('Tiết kiệm hiện tại').fill('10000000');
  await page.getByLabel('Quỹ khẩn cấp').fill('8000000');
  await page.getByRole('button', { name: 'Ổn định', exact: true }).click();
  await page.getByLabel('Mức giảm/tăng (%) hoặc số tiền (₫)').fill('50');
  await page.getByRole('button', { name: 'Thêm tác động' }).click();
  await page.getByRole('button', { name: 'Tính kịch bản' }).click();
  await expect(page.getByText('Dòng tiền còn lại từng tháng')).toBeVisible();
  await expect(page.getByText('Phí ban đầu chưa biết')).toBeVisible();
  if (process.env.FINORA_VISUAL_TWIN === '1') {
    await page.screenshot({ path: info.outputPath('twin-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('Trạng thái tài chính hàng tháng').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('twin-phone-top.png'), fullPage: true });
    await page.getByText('Sức chịu đựng tài chính:', { exact: false }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('twin-phone-result.png'), fullPage: true });
    const preference = await page.request.put(api + '/api/preferences', {
      data: { locale: 'vi-VN', appearance: 'dark' },
    });
    expect(preference.ok(), await preference.text()).toBe(true);
    await page.reload();
    await expect(page.getByText('Trạng thái tài chính hàng tháng')).toBeVisible();
    await page.screenshot({ path: info.outputPath('twin-dark.png'), fullPage: true });
  }

  const otherContext = await page.context().browser()!.newContext();
  const other = await createLegacyAccount(otherContext.request, {
    name: 'Synthetic other owner',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(other.ok(), await other.text()).toBe(true);
  expect(
    (
      await otherContext.request.post(url, { data: { state, scenarios: payload.scenarios } })
    ).status(),
  ).toBe(404);
  await otherContext.close();
});
