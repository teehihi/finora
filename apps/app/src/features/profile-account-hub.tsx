import { Image, Text as NativeText, View } from 'react-native';
import {
  Activity,
  Banknote,
  Bell,
  Bookmark,
  CalendarDays,
  ChevronRight,
  FileText,
  Fingerprint,
  Headphones,
  History,
  Info,
  LockKeyhole,
  MessageSquare,
  Moon,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { profileMenuCopy } from '@finora/i18n';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import { useAccountAvatar } from './account-avatar/client';
import { useProfileChrome } from './profile-chrome';

export const accountSections = [
  'personal',
  'finance',
  'preferences',
  'privacy',
  'health',
  'help',
  'about',
] as const;
export type AccountSection = (typeof accountSections)[number];
export function accountSection(value: unknown): AccountSection | undefined {
  return accountSections.find((section) => section === value);
}

export function ProfileAvatar({
  name,
  owner,
  size = 48,
}: {
  name: string;
  owner?: string;
  size?: number;
}) {
  const { colors: c, locale } = useDesign();
  const { palette: p } = useProfileChrome();
  const image = useAccountAvatar(owner).data?.dataUrl;
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
        backgroundColor: p.profileChip,
        overflow: 'hidden',
      }}
    >
      {image ? (
        <Image
          testID="account-avatar-image"
          accessible={false}
          source={{ uri: image }}
          style={{ width: size, height: size }}
        />
      ) : (
        <NativeText
          allowFontScaling={false}
          style={{ fontFamily: tokens.font.heading, fontSize: size * 0.4, color: c.primary }}
        >
          {(Array.from(name.trim())[0] || 'F').toLocaleUpperCase(locale)}
        </NativeText>
      )}
    </View>
  );
}

export function AccountHero({
  name,
  owner,
  open,
  payments,
  cashflow,
}: {
  name: string;
  owner?: string;
  open: () => void;
  payments: () => void;
  cashflow: () => void;
}) {
  const { colors: c, locale, t } = useDesign();
  const { night, palette: p } = useProfileChrome();
  const vi = locale === 'vi-VN';
  const shortcuts = [
    { label: vi ? 'Lịch trả nợ' : 'Repayment schedule', icon: CalendarDays, action: payments },
    { label: vi ? 'Bản đồ dòng tiền' : 'Cash-flow map', icon: TrendingUp, action: cashflow },
  ] as const;
  return (
    <View testID="account-hub-hero">
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 20,
          minHeight: 75,
          justifyContent: 'center',
        }}
      >
        <Heading size={23} style={{ color: p.ink }}>
          {t('profileTitle')}
        </Heading>
      </View>
      <View
        style={{
          marginHorizontal: 15,
          borderRadius: 18,
          backgroundColor: p.surface,
          padding: 14,
          gap: 10,
          boxShadow: night ? '0px 6px 20px #00000030' : '0px 7px 24px #142D2316',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <ProfileAvatar name={name} owner={owner} size={47} />
          <Text bold style={{ flex: 1, minWidth: 0, color: p.ink, fontSize: 17, lineHeight: 23 }}>
            {name}
          </Text>
          <Action
            label={vi ? 'Hồ sơ cá nhân' : 'Personal profile'}
            onPress={open}
            style={{
              flexShrink: 1,
              borderRadius: 22,
              backgroundColor: p.profileChip,
              paddingHorizontal: 13,
              alignItems: 'center',
            }}
          >
            <Text bold small style={{ color: c.primary, textAlign: 'center' }}>
              {vi ? 'Hồ sơ' : 'Profile'}
            </Text>
          </Action>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {shortcuts.map(({ label, icon: Icon, action }) => (
            <Action
              key={label}
              label={label}
              onPress={action}
              style={{
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                borderRadius: 9,
                gap: 6,
                paddingHorizontal: 6,
                paddingVertical: 5,
                backgroundColor: c.secondary,
              }}
            >
              <Icon size={15} color={c.primary} />
              <Text small bold style={{ lineHeight: 16, color: c.primary, flexShrink: 1 }}>
                {label}
              </Text>
            </Action>
          ))}
        </View>
      </View>
    </View>
  );
}

export type AccountDestination = AccountSection | 'documents' | 'simulations';

export function AccountGroups({ open }: { open: (section: AccountDestination) => void }) {
  const { locale, t } = useDesign();
  const { night, palette: p } = useProfileChrome();
  const vi = locale === 'vi-VN';
  const copy = profileMenuCopy[locale];
  type Row = { section?: AccountDestination; title: string; icon: typeof Banknote };
  const groups: Array<{ title: string; items: Row[] }> = [
    {
      title: vi ? 'Mục chính' : 'Main',
      items: [
        { section: 'finance', title: t('finance'), icon: Banknote },
        { section: 'health', title: copy.health, icon: Activity },
        { section: 'documents', title: copy.documents, icon: FileText },
        { title: copy.savedProducts, icon: Bookmark },
        { section: 'simulations', title: copy.simulations, icon: History },
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
        { title: copy.finPreferences, icon: Sparkles },
        { title: copy.reminders, icon: Bell },
        { section: 'privacy', title: t('privacy'), icon: LockKeyhole },
      ],
    },
    {
      title: copy.support,
      items: [
        { section: 'help', title: copy.help, icon: Headphones },
        { title: copy.feedback, icon: MessageSquare },
        { section: 'about', title: copy.about, icon: Info },
      ],
    },
  ];
  const rowStyle = {
    minHeight: 52,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  } as const;
  return (
    <View testID="account-hub-groups" style={{ gap: 15 }}>
      {groups.map(({ title, items }) => (
        <View key={title} style={{ gap: 6 }}>
          <Heading size={16} style={{ color: p.ink }}>
            {title}
          </Heading>
          <View
            style={{
              borderRadius: 14,
              backgroundColor: p.surface,
              paddingHorizontal: 14,
              boxShadow: night ? '0px 2px 6px #00000010' : '0px 2px 7px #151C260A',
            }}
          >
            {items.map(({ section, title: label, icon: Icon }, index) => (
              <View key={label} style={{ borderTopWidth: index ? 1 : 0, borderColor: p.line }}>
                {section ? (
                  <Action label={label} onPress={() => open(section)} style={rowStyle}>
                    <Icon size={19} color={p.icon} />
                    <Text style={{ flex: 1, minWidth: 0, color: p.ink }}>{label}</Text>
                    <ChevronRight size={16} color={p.muted} />
                  </Action>
                ) : (
                  <View style={rowStyle}>
                    <Icon size={19} color={p.muted} />
                    <Text style={{ flex: 1, minWidth: 0, color: p.muted }}>{label}</Text>
                    <Text small style={{ flexShrink: 1, maxWidth: '35%', color: p.muted }}>
                      {copy.unavailable}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
