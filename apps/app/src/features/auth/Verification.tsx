import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Action, Field, Text, useDesign } from '@finora/ui';
import { normaliseCode } from './identity';

export const resendDelay = 30_000;

export function VerificationField({
  code,
  setCode,
  onSubmit,
  editable,
}: {
  code: string;
  setCode: (code: string) => void;
  onSubmit: () => void;
  editable: boolean;
}) {
  const { t } = useDesign();
  return (
    <Field
      label={t('authCodeLabel')}
      value={code}
      autoFocus
      onChangeText={(value) => setCode(normaliseCode(value))}
      keyboardType="number-pad"
      inputMode="numeric"
      autoComplete="one-time-code"
      textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
      autoCapitalize="none"
      autoCorrect={false}
      // Normalize rather than truncating before normalization so formatted pastes work.
      style={{ letterSpacing: 7, fontSize: 24, textAlign: 'center', fontVariant: ['tabular-nums'] }}
      placeholder="000000"
      editable={editable}
      onSubmitEditing={onSubmit}
    />
  );
}

export function ResendCode({
  until,
  disabled,
  loading = false,
  onPress,
}: {
  until: number;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const { colors: c, t } = useDesign();
  const [now, setNow] = useState(Date.now);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  const label = loading
    ? t('authSendingCode')
    : seconds
      ? t('authResendIn').replace('{s}', String(seconds))
      : t('authResend');
  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Action label={label} disabled={seconds > 0 || loading || disabled} onPress={onPress}>
        <Text small bold style={{ color: c.primary }}>
          {label}
        </Text>
      </Action>
    </View>
  );
}
