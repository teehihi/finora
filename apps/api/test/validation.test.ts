import { BadRequestException } from '@nestjs/common';
import { Validate } from '../src/common/http';
import { profileSchema, chatSchema } from '@finora/contracts';
describe('request boundaries', () => {
  it('accepts a complete profile', () =>
    expect(
      new Validate(profileSchema).transform({ income: 100, debt: 0, expenses: 0 }).income,
    ).toBe(100));
  it('rejects injected ownership fields', () =>
    expect(() =>
      new Validate(profileSchema).transform({ income: 100, debt: 0, expenses: 0, userId: 'other' }),
    ).toThrow(BadRequestException));
  it('rejects arbitrary assistant tools', () =>
    expect(() =>
      new Validate(chatSchema).transform({
        requestId: '00000000-0000-4000-8000-000000000000',
        prompt: 'x',
        locale: 'vi-VN',
        tool: 'queryDatabase',
      }),
    ).toThrow(BadRequestException));
});
