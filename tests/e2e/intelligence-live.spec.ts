import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';
import { simulate } from '../../packages/financial-engine/src/index';

test('consented Claude turn persists and follow-up has a safe provider result', async ({
  context,
}) => {
  test.skip(
    process.env.FINORA_LIVE_AI_TEST !== '1',
    'Requires an explicitly configured live provider and network access',
  );
  const api = 'http://localhost:3000/api/intelligence';
  const signedUp = await createLegacyAccount(context.request, {
    name: 'Synthetic live AI QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(signedUp.ok(), await signedUp.text()).toBe(true);
  expect(await (await context.request.get(api + '/status')).json()).toMatchObject({
    provider: 'anthropic',
  });

  async function turn(prompt: string, externalConsent: boolean) {
    const response = await context.request.post(api + '/stream', {
      data: { requestId: randomUUID(), prompt, locale: 'en-US', externalConsent },
      timeout: 60_000,
    });
    expect(response.ok()).toBe(true);
    const events = (await response.text())
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map(
        (line) =>
          JSON.parse(line.slice(6)) as {
            type: string;
            provider?: string;
            blocks?: { kind: string }[];
          },
      );
    expect(events.at(-1)?.type).toBe('done');
    return events;
  }

  const firstPrompt =
    'I am considering a loan. Please answer exactly: I can help you explore your options.';
  const local = await turn(firstPrompt, false);
  expect(local.find((event) => event.type === 'meta')?.provider).toBe('mock');
  const first = await turn(firstPrompt, true);
  expect(first.find((event) => event.type === 'meta')?.provider).toBe('anthropic');
  const second = await turn('Could you continue helping me understand loans?', true);
  const secondProvider = second.find((event) => event.type === 'meta')?.provider;
  expect(['anthropic', 'mock']).toContain(secondProvider);
  if (secondProvider === 'mock') expect(second.some((event) => event.type === 'delta')).toBe(true);
  const history = (await (await context.request.get(api + '/history')).json()) as {
    provider: string;
    prompt: string;
  }[];
  expect(history.map(({ provider }) => provider)).toEqual(['mock', 'anthropic', secondProvider]);
  expect(history[2]?.prompt).toBe('Could you continue helping me understand loans?');
});

test('three consented loan consultation turns stay live and use verified calculations', async ({
  context,
}) => {
  test.skip(process.env.FINORA_LIVE_AI_TEST !== '1', 'Requires configured live Anthropic access');
  const api = 'http://localhost:3000/api/intelligence';
  const signedUp = await createLegacyAccount(context.request, {
    name: 'Synthetic three-turn loan QA',
    email: randomUUID() + '@example.test',
    password: randomUUID(),
  });
  expect(signedUp.ok(), await signedUp.text()).toBe(true);
  const turns = [
    'Tôi muốn vay 50 triệu mua xe, so sánh kỳ hạn 12 tháng và 24 tháng.',
    'Thu nhập 15 triệu mỗi tháng, chi phí sinh hoạt 8 triệu, đang trả nợ 1 triệu. Thu nhập ổn định, tiết kiệm dự phòng 20 triệu, muốn giữ dự phòng 3 tháng và trả tối đa 3 triệu mỗi tháng.',
    'Lãi suất danh nghĩa 12% mỗi năm, trả góp đều. Tôi chưa biết phí.',
  ];
  const results: {
    type: string;
    provider?: string;
    blocks?: { kind: string; months?: number }[];
  }[][] = [];
  for (const prompt of turns) {
    const response = await context.request.post(api + '/stream', {
      data: { requestId: randomUUID(), prompt, locale: 'vi-VN', externalConsent: true },
      timeout: 60_000,
    });
    expect(response.ok(), await response.text()).toBe(true);
    const events = (await response.text())
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map(
        (line) =>
          JSON.parse(line.slice(6)) as {
            type: string;
            provider?: string;
            blocks?: { kind: string; months?: number }[];
          },
      );
    expect(events.at(-1)?.type).toBe('done');
    expect(events.find((event) => event.type === 'meta')?.provider).toBe('anthropic');
    results.push(events);
  }
  expect(
    results[0]
      ?.find((event) => event.type === 'structured')
      ?.blocks?.some((block) => block.kind === 'missing'),
  ).toBe(true);
  const blocks = results[2]?.find((event) => event.type === 'structured')?.blocks ?? [];
  const scenarios = blocks.filter((block) => block.kind === 'scenario') as {
    kind: string;
    principal: number;
    months: number;
    firstDue: string;
    annualRate: number;
    method: 'annuity' | 'flat' | 'equalPrincipal';
    fee: number | null;
    firstPayment: number;
    peakPayment: number;
    repayment: number;
    total: number | null;
  }[];
  expect(scenarios.map((block) => block.months)).toEqual([12, 24]);
  for (const plan of scenarios) {
    expect(plan.annualRate).toBe(12);
    expect(plan.fee).toBeNull();
    const engine = simulate({
      principal: plan.principal,
      months: plan.months,
      firstDue: plan.firstDue,
      annualRate: plan.annualRate,
      method: plan.method,
      fee: plan.fee,
    });
    expect(plan.firstPayment).toBe(engine.firstPayment);
    expect(plan.peakPayment).toBe(Math.max(...engine.schedule.map((payment) => payment.payment)));
    expect(plan.repayment).toBe(engine.repayment);
    expect(plan.total).toBe(engine.total);
  }
  const history = (await (await context.request.get(api + '/history')).json()) as {
    provider: string;
  }[];
  expect(history.map((turn) => turn.provider)).toEqual(['anthropic', 'anthropic', 'anthropic']);
});
