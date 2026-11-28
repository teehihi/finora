import { useState, type ComponentProps } from 'react';
import { TextInput, View } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { Action, Text, useDesign } from '@finora/ui';

type NativeInputProps = Omit<
  ComponentProps<typeof TextInput>,
  'secureTextEntry' | 'style' | 'onFocus' | 'onBlur'
>;

export function AuthInputField({
  label,
  icon: Icon,
  error,
  secure = false,
  ...inputProps
}: NativeInputProps & { label: string; icon: LucideIcon; error?: string; secure?: boolean }) {
  const { colors: c, t } = useDesign();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const passwordVisible = secure && revealed;
  return (
    <View style={{ gap: 6 }}>
      <Text small bold style={{ color: c.foreground }}>
        {label}
      </Text>
      <View
        testID="finora-auth-input-group"
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          borderWidth: focused ? 1.5 : 1,
          borderColor: error ? c.error : focused ? c.focus : c.border,
          borderRadius: 15,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
        }}
      >
        <Icon size={19} color={focused ? c.primary : c.muted} strokeWidth={1.8} />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={c.muted}
          underlineColorAndroid="transparent"
          secureTextEntry={secure && !passwordVisible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 52,
            paddingVertical: 10,
            outlineWidth: 0,
            color: c.foreground,
            fontFamily: 'Geist',
            fontSize: 16,
          }}
        />
        {secure ? (
          <Action
            label={t(passwordVisible ? 'authHidePassword' : 'authShowPassword')}
            onPress={() => setRevealed((value) => !value)}
            style={{ minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            {passwordVisible ? (
              <EyeOff size={19} color={c.muted} />
            ) : (
              <Eye size={19} color={c.muted} />
            )}
          </Action>
        ) : null}
      </View>
      {error ? (
        <Text small role="alert" style={{ color: c.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
