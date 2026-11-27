import { Text as NativeText, View } from 'react-native';
import { Banknote, ChevronRight, Fingerprint, LockKeyhole, Moon } from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { workspaceArtwork } from '../components/workspace-artwork';
import { SceneWash } from '../components/workspace-scene';

export const accountSections = ['personal', 'finance', 'preferences', 'privacy'] as const;
export type AccountSection = (typeof accountSections)[number];
export function accountSection(value: unknown): AccountSection | undefined {
  return accountSections.find((section) => section === value);
}

export function ProfileAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const { colors: c, locale } = useDesign();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.secondary,
      }}
    >
      <NativeText
        allowFontScaling={false}
        style={{ fontFamily: tokens.font.heading, fontSize: size * 0.4, color: c.primary }}
      >
        {(Array.from(name.trim())[0] || 'F').toLocaleUpperCase(locale)}
      </NativeText>
    </View>
  );
}

export function AccountHero({ name, open }: { name: string; open: () => void }) {
  const { colors: c, locale, t } = useDesign();
  const vi = locale === 'vi-VN';
  return (
    <View testID="account-hub-hero" style={{ gap: 8 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 36,
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        <SceneWash image={workspaceArtwork.profile} subdued />
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 }}>
        <Heading size={24}>{t('profileTitle')}</Heading>
      </View>
      <View
        style={{
          marginHorizontal: 11,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: c.surface,
          borderRadius: 19,
          borderColor: c.border,
          borderWidth: 1,
        }}
      >
        <ProfileAvatar name={name} />
        <Text bold style={{ flex: 1, minWidth: 0 }}>
          {name}
        </Text>
        <Action
          label={vi ? 'Hồ sơ cá nhân' : 'Personal profile'}
          onPress={open}
          style={{
            flexShrink: 1,
            borderRadius: 24,
            backgroundColor: c.secondary,
            paddingHorizontal: 11,
            paddingVertical: 4,
            alignItems: 'center',
          }}
        >
          <Text bold small style={{ color: c.primary, textAlign: 'center' }}>
            {vi ? 'Hồ sơ' : 'Profile'}
          </Text>
        </Action>
      </View>
    </View>
  );
}

export function AccountGroups({ open }: { open: (section: AccountSection) => void }) {
  const { colors: c, locale, t } = useDesign();
  const vi = locale === 'vi-VN';
  const groups = [
    {
      title: vi ? 'Mục chính' : 'Main',
      items: [
        { section: 'finance', title: t('finance'), icon: Banknote },
        {
          section: 'personal',
          title: vi ? 'Thông tin và bảo mật' : 'Personal information and security',
          icon: Fingerprint,
        },
      ],
    },
    {
      title: vi ? 'Cài đặt' : 'Settings',
      items: [
        { section: 'preferences', title: t('settingsPreferences'), icon: Moon },
        { section: 'privacy', title: t('privacy'), icon: LockKeyhole },
      ],
    },
  ] as const;
  return (
    <View testID="account-hub-groups" style={{ gap: 15 }}>
      {groups.map(({ title, items }) => (
        <View key={title} style={{ gap: 6 }}>
          <Heading size={16}>{title}</Heading>
          <View
            style={{
              borderRadius: 18,
              borderColor: c.border,
              borderWidth: 1,
              backgroundColor: c.surface,
              paddingHorizontal: 12,
            }}
          >
            {items.map(({ section, title: label, icon: Icon }, index) => (
              <View key={section} style={{ borderTopWidth: index ? 1 : 0, borderColor: c.border }}>
                <Action
                  label={label}
                  onPress={() => open(section)}
                  style={{
                    minHeight: 52,
                    paddingVertical: 7,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                  }}
                >
                  <Icon size={19} color={c.primary} />
                  <Text style={{ flex: 1, minWidth: 0 }}>{label}</Text>
                  <ChevronRight size={16} color={c.muted} />
                </Action>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
