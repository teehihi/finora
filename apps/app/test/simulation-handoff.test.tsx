import {
  clearSimulationHandoff,
  prepareSimulationHandoff,
  readSimulationHandoff,
  readSimulationHandoffContext,
} from '../src/features/simulation-handoff';

jest.mock('../src/services/request-id', () => ({ requestId: () => 'opaque-handoff-id' }));

const input = {
  principal: 50_000_000,
  months: 24,
  annualRate: 12,
  firstDue: '2026-12-01',
  method: 'annuity',
  fee: null,
} as const;

test('prefills only the intended owner and preserves unknown fees', () => {
  const id = prepareSimulationHandoff('owner', input);
  expect(readSimulationHandoff('other', id)).toBeUndefined();
  expect(readSimulationHandoff('owner', 'other-id')).toBeUndefined();
  expect(readSimulationHandoff('owner', id)).toEqual({
    principal: '50000000',
    months: '24',
    annualRate: '12',
    firstDue: '2026-12-01',
    method: 'annuity',
    fee: '',
  });
  clearSimulationHandoff('owner', id);
  expect(readSimulationHandoff('owner', id)).toBeUndefined();
});

test('discards invalid inputs and expires unread handoffs', () => {
  expect(prepareSimulationHandoff('owner', { ...input, months: 0 })).toBeUndefined();
  const now = Date.now();
  const clock = jest.spyOn(Date, 'now');
  try {
    clock.mockReturnValue(now);
    const id = prepareSimulationHandoff('owner', { ...input, fee: 0 });
    expect(readSimulationHandoff('owner', id)?.fee).toBe('0');
    clock.mockReturnValue(now + 60_001);
    expect(readSimulationHandoff('owner', id)).toBeUndefined();
    clearSimulationHandoff();
  } finally {
    clock.mockRestore();
  }
});

test('retains document origin as display context without embedding a receipt identifier', () => {
  const id = prepareSimulationHandoff('owner', input, 'document');
  expect(readSimulationHandoffContext('other', id)).toBeUndefined();
  expect(readSimulationHandoffContext('owner', id)).toEqual({
    fields: readSimulationHandoff('owner', id),
    origin: 'document',
  });
  clearSimulationHandoff('owner', id);
});
