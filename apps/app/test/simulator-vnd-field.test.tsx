import { expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { SimulatorVndField } from '../src/features/simulator-vnd-field';

test('does not change the formatted value on focus; edits stay raw until blur', async () => {
  const onChangeText = jest.fn();
  const onBlur = jest.fn();
  const field = (value: string) => (
    <SimulatorVndField
      label="Số tiền vay"
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      keyboardType="number-pad"
    />
  );
  const screen = await render(field('50000000'));
  const input = () => screen.getByLabelText('Số tiền vay');
  expect(input().props.value).toBe('50.000.000');
  await fireEvent(input(), 'focus');
  expect(input().props.value).toBe('50.000.000');
  expect(input().props.selectTextOnFocus).toBe(true);
  await fireEvent.changeText(input(), '52000000');
  expect(onChangeText).toHaveBeenLastCalledWith('52000000');
  await screen.rerender(field('52000000'));
  expect(input().props.value).toBe('52000000');
  await fireEvent(input(), 'blur');
  expect(input().props.value).toBe('52.000.000');
  expect(onBlur).toHaveBeenCalledTimes(1);
});
