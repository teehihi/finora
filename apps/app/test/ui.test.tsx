import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button, Field, FinancialAmount, DesignContext } from '@finora/ui';
import { light } from '@finora/design-tokens';
describe('Finora controls', () => {
  it('labels actions and prevents duplicate presses while loading', async () => {
    const press = jest.fn();
    const screen = await render(<Button label="Save" onPress={press} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(press).toHaveBeenCalledTimes(1);
    await screen.rerender(<Button label="Save" onPress={press} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(press).toHaveBeenCalledTimes(1);
  });
  it('exposes labelled numeric input', async () => {
    const change = jest.fn();
    const screen = await render(<Field label="Thu nhập" onChangeText={change} />);
    await fireEvent.changeText(screen.getByLabelText('Thu nhập'), '3000');
    expect(change).toHaveBeenCalledWith('3000');
  });
  it('renders whole dong in Vietnamese', async () => {
    const s = await render(
      <DesignContext.Provider value={{ colors: light, locale: 'vi-VN' }}>
        <FinancialAmount value={1234567} />
      </DesignContext.Provider>,
    );
    expect(s.getByText(/1\.234\.567/)).toBeTruthy();
  });
});
