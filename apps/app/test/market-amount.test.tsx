import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AmountControl } from '../src/features/market-amount';

describe('market amount control', () => {
  it('offers labelled step controls and clamps changes to the selected product bounds', async () => {
    const change = jest.fn();
    const screen = await render(
      <AmountControl
        value={5_010_000}
        min={5_000_000}
        max={40_000_000}
        disabled={false}
        onChange={change}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Giảm số tiền vay' }));
    expect(change).toHaveBeenLastCalledWith(5_000_000);
    await screen.rerender(
      <AmountControl
        value={39_990_000}
        min={5_000_000}
        max={40_000_000}
        disabled={false}
        onChange={change}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Tăng số tiền vay' }));
    expect(change).toHaveBeenLastCalledWith(40_000_000);
  });

  it('does not alter the amount while a calculation or save is in progress', async () => {
    const change = jest.fn();
    const screen = await render(
      <AmountControl
        value={15_000_000}
        min={5_000_000}
        max={40_000_000}
        disabled
        onChange={change}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Tăng số tiền vay' }));
    expect(change).not.toHaveBeenCalled();
  });
});
