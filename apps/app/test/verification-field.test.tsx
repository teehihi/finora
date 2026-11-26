import { describe, expect, it, jest } from '@jest/globals';
import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { VerificationField } from '../src/features/auth/Verification';

jest.mock('../src/services/client', () => ({ base: 'http://localhost:3000' }));

describe('verification code control', () => {
  it('keeps one editable input, preserves leading zeros, and normalizes pasted codes', async () => {
    const submit = jest.fn();
    function Harness() {
      const [code, setCode] = useState('');
      return <VerificationField code={code} setCode={setCode} editable onSubmit={submit} />;
    }
    const screen = await render(<Harness />);
    const inputs = screen.getAllByLabelText('Mã xác minh 6 số');
    expect(inputs).toHaveLength(1);
    await fireEvent.changeText(inputs[0], '00 12-34 abc 99');
    expect(screen.getByLabelText('Mã xác minh 6 số').props.value).toBe('001234');
    await fireEvent(screen.getByLabelText('Mã xác minh 6 số'), 'submitEditing');
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
