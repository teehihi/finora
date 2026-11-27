import {
  Image,
  Text as NativeText,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import {
  ArrowUpRight,
  Banknote,
  Fingerprint,
  LockKeyhole,
  Moon,
  ShieldCheck,
} from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { Action, Eyebrow, Heading, Text, useDesign } from '@finora/ui';
import { SignatureIcon, type SignatureTone } from '../components/signature';

export type AccountSection = 'finance' | 'identity' | 'preferences' | 'privacy';

const shortcuts = [
  {
    id: 'finance',
    icon: Banknote,
    tone: 'emerald',
    vi: 'Tài chính',
    en: 'Finances',
    detailVi: 'Thu nhập và chi phí',
    detailEn: 'Income and expenses',
  },
  {
    id: 'identity',
    icon: Fingerprint,
    tone: 'blue',
    vi: 'Đăng nhập',
    en: 'Sign-in',
    detailVi: 'Email và xác minh',
    detailEn: 'Email and verification',
  },
  {
    id: 'preferences',
    icon: Moon,
    tone: 'violet',
    vi: 'Tùy chọn',
    en: 'Preferences',
    detailVi: 'Giao diện, ngôn ngữ',
    detailEn: 'Appearance, language',
  },
  {
    id: 'privacy',
    icon: LockKeyhole,
    tone: 'amber',
    vi: 'Riêng tư',
    en: 'Privacy',
    detailVi: 'Dữ liệu và lịch sử',
    detailEn: 'Data and history',
  },
] as const satisfies readonly {
  id: AccountSection;
  icon: typeof Banknote;
  tone: SignatureTone;
  vi: string;
  en: string;
  detailVi: string;
  detailEn: string;
}[];

export function ProfileCover({
  image,
  title,
  name,
  verified,
}: {
  image: ImageSourcePropType;
  title: string;
  name: string;
  verified: boolean;
}) {
  const { colors: c, locale } = useDesign();
  const { width, fontScale } = useWindowDimensions();
  const vi = locale === 'vi-VN';
  const roomy = width >= tokens.breakpoints.rail;
  const initial = (Array.from(name)[0] || 'F').toLocaleUpperCase(locale);
  return (
    <View
      testID="profile-cover-card"
      style={{
        backgroundColor: c.surface,
        borderColor: c.border,
        borderRadius: tokens.signature.radius,
        borderWidth: 1,
        overflow: 'hidden',
      }}
    >
      <View
        testID="profile-photo-cover"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: roomy ? 164 : 112, backgroundColor: c.elevated, overflow: 'hidden' }}
      >
        <Image
          source={image}
          accessible={false}
          resizeMode="cover"
          fadeDuration={0}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      <View
        style={{
          paddingHorizontal: roomy ? 22 : 15,
          paddingBottom: 15,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 11,
        }}
      >
        <View
          testID="profile-monogram"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            marginTop: -24,
            width: roomy ? 70 : 60,
            height: roomy ? 70 : 60,
            flexShrink: 0,
            borderWidth: 4,
            borderColor: c.surface,
            backgroundColor: c.primary,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NativeText
            style={{
              color: c.onPrimary,
              fontFamily: tokens.font.heading,
              fontSize: 25,
              lineHeight: 31,
            }}
            allowFontScaling={false}
          >
            {initial}
          </NativeText>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2, paddingTop: 9 }}>
          <Eyebrow tone="forest" style={{ fontSize: 11, lineHeight: 15 }}>
            FINORA · {vi ? 'Tài khoản' : 'Account'}
          </Eyebrow>
          <Heading size={roomy ? 31 : 21}>{title}</Heading>
          <Text style={{ color: c.muted }}>{name}</Text>
        </View>
        {verified && fontScale < 1.35 && width >= 360 ? (
          <View
            accessible
            accessibilityLabel={vi ? 'Email đã xác minh' : 'Email verified'}
            style={{ marginTop: 12, borderRadius: 14, backgroundColor: c.secondary, padding: 8 }}
          >
            <ShieldCheck size={19} color={c.success} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ProfileShortcuts({ open }: { open: (id: AccountSection) => void }) {
  const { colors: c, locale } = useDesign();
  const { width, fontScale } = useWindowDimensions();
  const vi = locale === 'vi-VN';
  const singleColumn = fontScale >= 1.25;
  const wide = width >= tokens.breakpoints.desktop;
  return (
    <View
      testID="profile-shortcuts"
      style={{
        padding: 12,
        gap: 8,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      <Heading size={17} style={{ marginLeft: 2 }}>
        {vi ? 'Quản lý tài khoản' : 'Manage account'}
      </Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {shortcuts.map((item) => {
          const label = vi ? item.vi : item.en;
          return (
            <Action
              key={item.id}
              label={(vi ? 'Đến mục ' : 'Go to ') + label}
              onPress={() => open(item.id)}
              style={{
                flexGrow: 1,
                flexBasis: singleColumn ? '100%' : wide ? '23%' : '47%',
                minWidth: 0,
                minHeight: 50,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: c.border,
                padding: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <SignatureIcon icon={item.icon} tone={item.tone} size={30} />
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Text small bold style={{ lineHeight: 16 }}>
                  {label}
                </Text>
                {width >= 360 || singleColumn ? (
                  <Text muted style={{ fontSize: 11, lineHeight: 14 }}>
                    {vi ? item.detailVi : item.detailEn}
                  </Text>
                ) : null}
              </View>
              <ArrowUpRight size={13} color={c.muted} />
            </Action>
          );
        })}
      </View>
    </View>
  );
}
