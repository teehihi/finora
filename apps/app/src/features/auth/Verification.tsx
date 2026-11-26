import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Action, Text, useDesign } from '@finora/ui';
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
  const { colors: c, t } = useDesign();
  const [focused, setFocused] = useState(false);
  const label = t('authCodeLabel');
  return (
    <View style={{ gap: 7 }}>
      <Text small bold>
        {label}
      </Text>
      <View>
        <View
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', gap: 6 }}
        >
          {Array.from({ length: 6 }, (_, index) => {
            const active = editable && focused && index === Math.min(code.length, 5);
            return (
              <View
                key={index}
                style={{
                  flex: 1,
                  minHeight: 53,
                  borderRadius: 11,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? c.focus : c.borderStrong,
                  backgroundColor: active ? c.secondary : c.input,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  bold
                  style={{
                    color: code[index] ? c.foreground : c.muted,
                    fontSize: 21,
                    lineHeight: 29,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {code[index] ?? '·'}
                </Text>
              </View>
            );
          })}
        </View>
        <TextInput
          accessibilityLabel={label}
          value={code}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(value) => setCode(normaliseCode(value))}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="go"
          autoComplete="one-time-code"
          textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          // A single input keeps OS autofill, formatted paste and accessible editing.
          style={[StyleSheet.absoluteFill, { opacity: 0, fontSize: 16 }]}
          editable={editable}
          onSubmitEditing={onSubmit}
        />
      </View>
    </View>
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
