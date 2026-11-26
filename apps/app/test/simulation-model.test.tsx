import { describe, expect, it } from '@jest/globals';
import type { Product } from '@finora/contracts';
import {
  commonScenarioBounds,
  matchedInputs,
  nextDue,
  normalizeIntegerInput,
  parseScenario,
  sameScenarioInput,
  scenarioDefaults,
} from '../src/features/simulation-model';

const a: Product = {
  id: 'a',
  name: 'Mẫu A',
  nameEn: 'Sample A',
  institution: 'Fixture',
  category: 'personal',
  amountMin: 5_000_000,
  amountMax: 50_000_000,
  monthsMin: 6,
  monthsMax: 36,
  rateMin: 12,
  rateMax: 18,
  fee: null,
  method: 'flat',
  source: 'Fixture only',
};
const b: Product = {
  ...a,
  id: 'b',
  amountMin: 15_000_000,
  amountMax: 80_000_000,
  monthsMin: 12,
  monthsMax: 48,
  rateMin: 10,
  fee: 125_000,
  method: 'equalPrincipal',
};

describe('personal and like-for-like simulations', () => {
  it('intersects known ranges before comparing, keeping separate methods and fee states', () => {
    expect(commonScenarioBounds([a, b])).toEqual({
      amountMin: 15_000_000,
      amountMax: 50_000_000,
      monthsMin: 12,
      monthsMax: 36,
    });
    const criteria = { amount: '15000000', months: '12', firstDue: '2026-12-31' };
    expect(matchedInputs([a, b], criteria)).toMatchObject([
      {
        firstDue: criteria.firstDue,
        principal: 15_000_000,
        months: 12,
        annualRate: 12,
        method: 'flat',
        fee: null,
      },
      {
        firstDue: criteria.firstDue,
        principal: 15_000_000,
        months: 12,
        annualRate: 10,
        method: 'equalPrincipal',
        fee: 125_000,
      },
    ]);
    expect(matchedInputs([a, b], { ...criteria, months: '6' })).toBeNull();
    expect(commonScenarioBounds([a, { ...b, amountMin: 55_000_000 }])).toBeNull();
  });

  it('does not furnish fictional personal rates, amounts or methods', () => {
    expect(scenarioDefaults(null)).toMatchObject({
      principal: '',
      annualRate: '',
      method: '',
      fee: '',
    });
    const fields = {
      principal: '50000000',
      months: '12',
      annualRate: '12,25',
      firstDue: '2026-12-31',
      method: 'annuity' as const,
      fee: '',
    };
    expect(parseScenario(null, fields)).toMatchObject({ annualRate: 12.25, fee: null });
    expect(parseScenario(null, { ...fields, fee: '0' })).toMatchObject({ fee: 0 });
    expect(parseScenario(null, { ...fields, fee: '1.25' })).toBeNull();
    expect(parseScenario(null, { ...fields, method: '' })).toBeNull();
    expect(parseScenario(null, { ...fields, principal: '5e7' })).toBeNull();
    expect(parseScenario(null, { ...fields, months: '361' })).toBeNull();
    expect(parseScenario(null, { ...fields, firstDue: '2026-02-29' })).toBeNull();
  });

  it('limits normalized prefill to sample bounds and ignores stale or malformed query values', () => {
    expect(scenarioDefaults(a, { amount: '20000000', months: '24' })).toMatchObject({
      principal: '20000000',
      months: '24',
      annualRate: '12',
    });
    expect(scenarioDefaults(a, { amount: 'Infinity', months: '999' })).toMatchObject({
      principal: '30000000',
      months: '36',
    });
  });

  it('does not reuse a stale estimate when the fee status or date changes', () => {
    const pair = matchedInputs([a, b], {
      amount: '15000000',
      months: '12',
      firstDue: '2027-01-31',
    });
    expect(pair).not.toBeNull();
    const [loan] = pair!;
    expect(sameScenarioInput(loan, { ...loan })).toBe(true);
    expect(sameScenarioInput(loan, { ...loan, fee: 0 })).toBe(false);
    expect(sameScenarioInput(loan, { ...loan, firstDue: '2027-01-30' })).toBe(false);
  });

  it('normalizes exact locale thousands grouping and defaults due month in Vietnam', () => {
    expect(normalizeIntegerInput('50.000.000', 'vi-VN')).toBe('50000000');
    expect(normalizeIntegerInput('5,200', 'en-US')).toBe('5200');
    expect(normalizeIntegerInput('5\u00a0200', 'vi-VN')).toBe('5200');
    expect(normalizeIntegerInput('1 2', 'vi-VN')).toBe('1 2');
    expect(nextDue(new Date('2026-12-31T17:01:00Z'))).toBe('2027-02-01');
  });
});
