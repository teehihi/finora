import {
  analysisBlocks,
  captureContext,
  continueIntent,
  persistedAnalysis,
} from '../src/modules/intelligence-context.js';
import {
  buildProfile,
  interpret,
  scenarioInput,
  stressBudget,
  toScenario,
} from '../src/modules/intelligence-rules.js';
import { financialTools } from '../src/modules/tools.js';

const date = '2027-01-01';
const ask =
  'Thu nhập 15 triệu, chi phí sinh hoạt 8 triệu, đang trả nợ 1 triệu. Tôi muốn vay 50 triệu mua xe, 12 tháng hay 24 tháng?';
const parse = (
  question: string,
  history: { blocks: unknown; prompt: string; simulationId: string | null }[] = [],
) => continueIntent(interpret(question), question, history);
const store = (prompt: string, context?: ReturnType<typeof captureContext>) => ({
  prompt,
  blocks: persistedAnalysis([], context),
  simulationId: null,
});

describe('conversation-local borrowing assumptions', () => {
  it('retains the actual five-turn Vietnamese consultation and summarizes known facts', () => {
    const turns = [
      'Tôi muốn vay 20 triệu để sửa xe.',
      'Thu nhập của tôi là 12 triệu mỗi tháng.',
      'Chi phí sinh hoạt khoảng 7 triệu, đang trả một khoản nợ khác 500 nghìn mỗi tháng.',
      'Tôi muốn vay trong 12 tháng và trả tối đa 2 triệu mỗi tháng.',
      'Tôi có 10 triệu tiết kiệm và muốn giữ lại ít nhất 5 triệu làm quỹ dự phòng.',
    ];
    const history: ReturnType<typeof store>[] = [];
    for (const prompt of turns) {
      const next = parse(prompt, history);
      history.unshift(store(prompt, captureContext(next.intent)));
    }
    const summary = parse(
      'Hãy tổng hợp hồ sơ tài chính và phân tích khả năng chi trả của tôi.',
      history,
    );
    expect(summary.intent).toMatchObject({
      principal: 20_000_000,
      purpose: 'vehicle',
      income: 12_000_000,
      expenses: 7_000_000,
      essentialExpenses: 7_000_000,
      debt: 500_000,
      months: 12,
      preferredPayment: 2_000_000,
      currentSavings: 10_000_000,
      minimumReserve: 5_000_000,
    });
    expect(summary.intent.amountStatus).toMatchObject({
      expenses: 'approximate',
      debt: 'stated',
      currentSavings: 'stated',
    });
    expect(buildProfile(summary.intent, null).missing).toEqual([]);
  });
  it('uses the retained budget when a later turn assumes an additional monthly payment', () => {
    const prior = interpret(
      'Vay 20 triệu sửa xe. Thu nhập 12 triệu, chi phí 7 triệu, trả nợ 500 nghìn.',
    );
    const prompt = 'Giả sử trả thêm 2 triệu mỗi tháng thì còn bao nhiêu?';
    const next = parse(prompt, [store('first', captureContext(prior))]);
    expect(next.continues).toBe(true);
    expect(next.intent).toMatchObject({
      principal: 20_000_000,
      income: 12_000_000,
      expenses: 7_000_000,
      debt: 500_000,
      knownPayment: 2_000_000,
    });
  });
  it('keeps loan terms separate from reserve months in a three-turn consultation', () => {
    const firstPrompt = 'Tôi muốn vay 50 triệu mua xe, so sánh kỳ hạn 12 tháng và 24 tháng.';
    const secondPrompt =
      'Thu nhập 15 triệu mỗi tháng, chi phí sinh hoạt 8 triệu, đang trả nợ 1 triệu. Thu nhập ổn định, tiết kiệm dự phòng 20 triệu, muốn giữ dự phòng 3 tháng và trả tối đa 3 triệu mỗi tháng.';
    const thirdPrompt = 'Lãi suất danh nghĩa 12% mỗi năm, trả góp đều. Tôi chưa biết phí.';
    const first = parse(firstPrompt);
    const second = parse(secondPrompt, [store(firstPrompt, captureContext(first.intent))]);
    expect(second.intent).toMatchObject({
      principal: 50_000_000,
      months: 12,
      secondMonths: 24,
      reserveMonths: 3,
      preferredPayment: 3_000_000,
    });
    const third = parse(thirdPrompt, [
      store(secondPrompt, captureContext(second.intent)),
      store(firstPrompt, captureContext(first.intent)),
    ]);
    expect(third.intent).toMatchObject({
      principal: 50_000_000,
      months: 12,
      secondMonths: 24,
      annualRate: 12,
      method: 'annuity',
      fee: null,
    });
    expect(scenarioInput(third.intent, undefined, date).success).toBe(true);
  });
  it('retains repayment preference, income stability and reserve goal across a clarification', () => {
    const first = interpret(
      'I want to borrow 50 million. My income is stable. I prefer a monthly payment of 3 million and need 6 months of emergency reserve.',
    );
    expect(first).toMatchObject({
      principal: 50_000_000,
      incomeStability: 'stable',
      preferredPayment: 3_000_000,
      reserveMonths: 6,
    });
    const next = parse('What if the term is 24 months?', [store('first', captureContext(first))]);
    expect(next.intent).toMatchObject({
      principal: 50_000_000,
      incomeStability: 'stable',
      preferredPayment: 3_000_000,
      reserveMonths: 6,
    });
  });

  it('distinguishes a zero reserve goal from an unknown goal', () => {
    expect(interpret('No emergency reserve required').reserveMonths).toBe(0);
    expect(interpret('I need a loan').reserveMonths).toBeUndefined();
  });
  it('keeps a partially specified comparison, collects missing terms, and stresses both durations', () => {
    const first = parse(ask).intent;
    expect(first).toMatchObject({
      income: 15_000_000,
      expenses: 8_000_000,
      debt: 1_000_000,
      principal: 50_000_000,
      months: 12,
      secondMonths: 24,
    });
    expect(scenarioInput(first, undefined, date).success).toBe(false);
    const answer = 'Lãi suất 12%/năm, trả góp đều. Chưa biết phí.';
    const clarified = parse(answer, [store(ask, captureContext(first))]);
    expect(clarified.intent).toMatchObject({
      principal: 50_000_000,
      months: 12,
      secondMonths: 24,
      annualRate: 12,
      method: 'annuity',
      fee: null,
    });
    const plan = scenarioInput(clarified.intent, undefined, date);
    expect(plan.success).toBe(true);
    const turn = store(answer, captureContext(clarified.intent, plan.data));
    expect(analysisBlocks(turn.blocks)).toEqual([]);
    const follow = parse('Nếu thu nhập tháng tới giảm 20% thì sao?', [turn]);
    expect(follow.firstDue).toBe(date);
    expect(follow.intent).toMatchObject({ months: 12, secondMonths: 24, incomeCut: 20 });
    const profile = buildProfile(follow.intent, null);
    expect(profile).toMatchObject({
      basis: 'user',
      profile: { income: 15_000_000, expenses: 8_000_000, debt: 1_000_000 },
    });
    for (const months of [12, 24]) {
      const loan = scenarioInput(follow.intent, undefined, date, months).data!;
      const caseBlock = toScenario(
        loan,
        financialTools.simulateRepaymentScenario(loan),
        follow.intent,
        profile.profile,
      );
      expect(caseBlock.total).toBeNull();
      expect(caseBlock.stressRemainingCash).toBe(3_000_000 - caseBlock.peakPayment);
    }
  });

  it('does not borrow assumptions for a new purpose or a general explanation', () => {
    const past = store(ask, captureContext(interpret(ask)));
    for (const question of ['Tôi muốn vay 20 triệu để sửa nhà.', 'Lãi phẳng nghĩa là gì?']) {
      const next = parse(question, [past]);
      expect(next.continues).toBe(false);
      expect(next.intent.annualRate).toBeUndefined();
    }
  });

  it('does not let unrelated chat overwrite the latest relevant context', () => {
    const general = 'Chào bạn.';
    const irrelevant = captureContext(interpret(general));
    expect(irrelevant).toBeUndefined();
    const past = store(ask, captureContext(interpret(ask)));
    const follow = parse('Nếu thu nhập giảm 20% thì sao?', [store(general, irrelevant), past]);
    expect(follow.intent).toMatchObject({ principal: 50_000_000, expenses: 8_000_000 });
  });

  it('keeps the base amount literal unless the user explicitly asks for a relative adjustment', () => {
    const past = store(ask, captureContext(interpret(ask)));
    const smaller = parse('Nếu vay ít hơn 10 triệu thì sao?', [past]).intent;
    expect(smaller).toMatchObject({ principal: 40_000_000, months: 12, secondMonths: 24 });
    const oneTerm = parse('Phương án 36 tháng thì sao?', [past]).intent;
    expect(oneTerm.secondMonths).toBeUndefined();
    expect(oneTerm.months).toBe(36);
    expect(parse('Vay ít hơn 10 triệu?', []).intent.principal).toBeUndefined();
  });

  it('keeps explicit unknown fees and never treats APR alone as a nominal input', () => {
    const i = interpret('Vay 50 triệu trong 24 tháng, trả góp đều. APR 16%, chưa biết phí.');
    expect(i).toMatchObject({
      principal: 50_000_000,
      aprOnly: true,
      annualRate: undefined,
      fee: null,
    });
    expect(scenarioInput(i, undefined, date).success).toBe(false);
  });

  it('does not replace upfront fees when discussing separate early-payoff fees', () => {
    const first = interpret(
      'Vay 50 triệu 24 tháng, lãi suất 12%/năm, trả góp đều, phí hồ sơ 500 nghìn.',
    );
    const next = parse('Nếu trả trước hạn sau 6 tháng, không phí tất toán?', [
      store('test', captureContext(first)),
    ]).intent;
    expect(next).toMatchObject({ early: true, payoffAfter: 6, payoffFeeRate: 0, fee: 500_000 });
  });

  it('asks for an unambiguous amount instead of assuming a scaled grouped number', () => {
    expect(
      interpret('Vay 1.234 triệu trong 12 tháng, lãi suất 12%/năm, trả góp đều.').principal,
    ).toBeUndefined();
    expect(interpret('Vay 8,5 triệu trong 12 tháng').principal).toBe(8_500_000);
  });

  it('keeps the income shock while updating expenses, then explicitly restores the baseline', () => {
    const profile = { income: 15_000_000, expenses: 8_000_000, debt: 1_000_000 };
    const initial = 'Vay 50 triệu 12 hoặc 24 tháng, lãi 12%/năm, trả góp đều. Thu nhập giảm 20%.';
    const past = store(initial, captureContext(interpret(initial)));
    const relative = 'Nếu chi phí sinh hoạt tăng 25% thì sao?';
    const second = parse(relative, [past]).intent;
    expect(second).toMatchObject({ incomeCut: 20, expenseRisePercent: 25 });
    expect(stressBudget(profile, second)).toEqual({
      cashFlow: 1_000_000,
      basis: {
        incomeReductionPercent: 20,
        expenseIncreasePercent: 25,
        monthlyIncomeLoss: 3_000_000,
        monthlyExpenseIncrease: 2_000_000,
      },
    });
    const recent = store(relative, captureContext(second));
    const absolute = 'Nếu chi phí sinh hoạt tăng 1 triệu thì sao?';
    const third = parse(absolute, [recent, past]).intent;
    expect(third).toMatchObject({
      incomeCut: 20,
      expenseRisePercent: undefined,
      extraExpense: 1_000_000,
    });
    expect(stressBudget(profile, third)?.cashFlow).toBe(2_000_000);
    const cleared = parse('Bỏ giả định biến động và xem lại phương án ban đầu.', [
      store(absolute, captureContext(third)),
      recent,
      past,
    ]).intent;
    expect(cleared).toMatchObject({ principal: 50_000_000, months: 12, secondMonths: 24 });
    expect(stressBudget(profile, cleared)).toBeNull();
  });

  it('keeps a zero denominator out of stress advice but accepts total loss of income', () => {
    const profile = { income: 15_000_000, expenses: 0, debt: 0 };
    expect(
      stressBudget(profile, interpret('Nếu thu nhập giảm 100% và chi phí sinh hoạt tăng 10%?')),
    ).toEqual({
      cashFlow: 0,
      basis: {
        incomeReductionPercent: 100,
        expenseIncreasePercent: 10,
        monthlyIncomeLoss: 15_000_000,
        monthlyExpenseIncrease: 0,
      },
    });
  });

  it('supports legacy stored analysis and separates independent saved references', () => {
    const notice = [{ kind: 'notice', message: 'An older turn' }] as const;
    expect(analysisBlocks(notice)).toEqual(notice);
    const attached = {
      principal: 12_000_000,
      months: 12,
      annualRate: 10,
      method: 'annuity',
      fee: 0,
      firstDue: date,
    } as const;
    const open = continueIntent(
      interpret('Nếu thu nhập giảm 20%?'),
      'Nếu thu nhập giảm 20%?',
      [store(ask, captureContext(interpret(ask)))],
      attached,
      'another-simulation',
    );
    expect(open.intent).toMatchObject({ principal: 12_000_000, months: 12, incomeCut: 20 });
    expect(open.intent.income).toBeUndefined();
  });
});
