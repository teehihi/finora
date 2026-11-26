import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CarFront,
  House,
  Info,
  Wallet,
} from 'lucide-react-native';
import { Heading, Text, useDesign } from '@finora/ui';
import { tokens } from '@finora/design-tokens';

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
  const { colors: c } = useDesign();
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
  return (
    <View
      accessible={false}
      style={{
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: c.secondary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={21} color={c.primary} />
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
              backgroundColor: index === 0 ? c.secondary : c.elevated,
              borderRadius: 13,
              padding: 11,
              gap: 4,
            }}
          >
            <Text small bold style={{ color: c.primary }}>
              {index === 0 ? 'A' : 'B'} · {p.institution}
            </Text>
            <Heading size={17}>{p.name}</Heading>
            {p.note ? (
              <Text muted small>
                {p.note}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ gap: 7 }}>
        {rows.map(({ label, values }, index) => (
          <View
            key={label}
            style={{
              gap: 4,
              padding: 9,
              borderRadius: 10,
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
