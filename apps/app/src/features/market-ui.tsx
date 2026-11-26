import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CarFront,
  House,
  Info,
  Percent,
  Wallet,
} from 'lucide-react-native';
import { Heading, Text, useDesign } from '@finora/ui';
import { tokens } from '@finora/design-tokens';
import { SignatureIcon, type SignatureTone } from '../components/signature';

export function MarketPanel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: tokens.radius.card,
        padding: 16,
        gap: 12,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

export function MarketNotice({
  title,
  children,
  verified = false,
}: {
  title?: string;
  children: ReactNode;
  verified?: boolean;
}) {
  const { colors: c } = useDesign();
  const Icon = verified ? BadgeCheck : Info;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: c.secondary,
        borderRadius: tokens.radius.control,
        padding: 12,
      }}
    >
      <Icon size={17} color={c.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {title ? (
          <Text small bold style={{ color: c.primary }}>
            {title}
          </Text>
        ) : null}
        <Text small>{children}</Text>
      </View>
    </View>
  );
}

export function ProductIcon({
  category,
}: {
  category?: 'personal' | 'education' | 'home' | 'auto';
}) {
  const Icon =
    category === 'home'
      ? House
      : category === 'education'
        ? BookOpen
        : category === 'auto'
          ? CarFront
          : category === 'personal'
            ? Wallet
            : Building2;
  const tone: SignatureTone =
    category === 'home'
      ? 'violet'
      : category === 'education'
        ? 'blue'
        : category === 'auto'
          ? 'amber'
          : 'emerald';
  return <SignatureIcon icon={Icon} tone={tone} size={46} />;
}

export function MarketRate({
  label,
  value,
  detail,
  published = false,
}: {
  label: string;
  value: string;
  detail: string;
  published?: boolean;
}) {
  const { colors: c } = useDesign();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 16,
        backgroundColor: published ? c.secondary : c.elevated,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text small muted>
          {label}
        </Text>
        <Text
          bold
          style={{
            color: c.primary,
            fontSize: 23,
            lineHeight: 28,
            letterSpacing: -0.55,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
        <Text small muted>
          {detail}
        </Text>
      </View>
      <SignatureIcon
        icon={Percent}
        size={36}
        tone={published ? 'lime' : 'emerald'}
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}

export function MarketFacts({ facts }: { facts: readonly (readonly [string, string])[] }) {
  const { colors: c } = useDesign();
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      {facts.map(([label, value]) => (
        <View
          key={label}
          style={{
            flexGrow: 1,
            flexBasis: '43%',
            minWidth: 95,
            gap: 3,
            paddingLeft: 9,
            paddingVertical: 1,
            borderLeftWidth: 2,
            borderLeftColor: c.border,
          }}
        >
          <Text small muted>
            {label}
          </Text>
          <Text small bold style={{ fontVariant: ['tabular-nums'], color: c.foreground }}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ComparisonGrid({
  products,
  rows,
}: {
  products: readonly [
    { name: string; institution: string; note?: string; footer: ReactNode },
    { name: string; institution: string; note?: string; footer: ReactNode },
  ];
  rows: { label: string; values: readonly [string, string] }[];
}) {
  const { colors: c } = useDesign();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {products.map((p, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: c.elevated,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 11,
              gap: 7,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderWidth: 1,
                }}
              >
                <Text small bold style={{ color: c.primary }}>
                  {index === 0 ? 'A' : 'B'}
                </Text>
              </View>
              <Text small muted style={{ flex: 1, minWidth: 0 }}>
                {p.institution}
              </Text>
            </View>
            <Heading size={17}>{p.name}</Heading>
            {p.note ? (
              <Text muted small>
                {p.note}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {rows.map(({ label, values }, index) => (
          <View
            key={label}
            style={{
              gap: 5,
              padding: 11,
              borderBottomWidth: index === rows.length - 1 ? 0 : 1,
              borderBottomColor: c.border,
              backgroundColor: index % 2 === 0 ? c.elevated : c.surface,
            }}
          >
            <Text muted small>
              {label}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {values.map((value, i) => (
                <Text
                  key={i}
                  small
                  bold
                  style={{ flex: 1, minWidth: 0, fontVariant: ['tabular-nums'] }}
                >
                  {value}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {products.map((p, i) => (
          <View key={i} style={{ flex: 1, minWidth: 0 }}>
            {p.footer}
          </View>
        ))}
      </View>
    </View>
  );
}
