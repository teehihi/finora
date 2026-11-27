import { View } from 'react-native';
import { Check, KeyRound, Mail, ShieldCheck } from 'lucide-react-native';
import { Text, useDesign } from '@finora/ui';

export function AccessProgress({ step }: { step: 'email' | 'code' | 'password' }) {
  const { colors: c, locale } = useDesign();
  const vi = locale === 'vi-VN';
  const email = 'Email';
  const code = vi ? 'Xác minh mã' : 'Verify code';
  const password = vi ? 'Mật khẩu hiện có' : 'Existing password';

  if (step === 'password') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <KeyRound size={16} color={c.primary} />
        <Text small bold style={{ color: c.primary }}>
          {password}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={
        step === 'email'
          ? vi
            ? 'Bước 1 trên 2: Email'
            : 'Step 1 of 2: Email'
          : vi
            ? 'Bước 2 trên 2: Xác minh mã'
            : 'Step 2 of 2: Verify code'
      }
      style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}
    >
      {(
        [
          { label: email, icon: step === 'code' ? Check : Mail, active: step === 'email' },
          { label: code, icon: ShieldCheck, active: step === 'code' },
        ] as const
      ).map(({ label, icon: Icon, active }, index) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
            paddingVertical: 4,
            paddingHorizontal: 9,
            borderRadius: 20,
            backgroundColor: active ? c.secondary : c.background,
            borderWidth: 1,
            borderColor: active ? c.primary : c.border,
          }}
        >
          <Icon size={14} color={active ? c.primary : c.muted} />
          <Text small bold style={{ color: active ? c.primary : c.muted }}>
            {index + 1}. {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
