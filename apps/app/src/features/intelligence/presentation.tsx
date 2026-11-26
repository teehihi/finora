import type { ReactNode } from 'react';
import { Image, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { ArrowUpRight, ChevronRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useId } from 'react';
import { tokens } from '@finora/design-tokens';
import { SignatureSweep } from '../../components/signature';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import fin from '../../../assets/brand/fin-assistant.png';

export function FinAvatar({ large = false }: { large?: boolean }) {
  const { colors: c } = useDesign();
  const size = large ? 43 : 34;
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        backgroundColor: c.secondary,
        borderRadius: size / 3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        accessible={false}
        source={fin}
        resizeMode="contain"
        style={{ width: size - 4, height: size - 4 }}
      />
    </View>
  );
}

export function FinIntro({
  title,
  description,
  wide,
  mode,
  signature = false,
}: {
  title: string;
  description: string;
  wide?: boolean;
  mode?: string;
  signature?: boolean;
}) {
  const { t, colors: c, locale } = useDesign();
  const id = 'finora-ai-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { fontScale } = useWindowDimensions();
  const compactFin = signature && fontScale >= 1.25;
  return (
    <View
      style={{
        minHeight: signature ? (wide ? 235 : 181) : wide ? 182 : 154,
        borderRadius: signature ? tokens.signature.radius : 23,
        backgroundColor: c.forest,
        padding: signature ? (wide ? 27 : 18) : wide ? 22 : 16,
        overflow: 'hidden',
      }}
    >
      {signature ? (
        <SignatureSweep name={id} />
      ) : (
        <View
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            top: -48,
            right: -31,
            width: 187,
            height: 187,
            borderRadius: 94,
            borderWidth: 1,
            borderColor: 'rgba(177,232,194,0.25)',
            backgroundColor: 'rgba(177,232,194,0.10)',
          }}
        />
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          marginBottom: signature ? 12 : 7,
          ...(signature
            ? {
                backgroundColor: c.signatureLime,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }
            : {}),
        }}
      >
        <Sparkles size={13} color={signature ? c.signatureInk : c.onForest} />
        <Text small bold style={{ color: signature ? c.signatureInk : c.onForest, fontSize: 11 }}>
          {signature
            ? locale === 'vi-VN'
              ? 'TRỢ LÝ VAY & TRẢ NỢ'
              : 'BORROWING AND REPAYMENT'
            : t('ai')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <Heading
            size={signature ? (wide ? 39 : 27) : wide ? 32 : 22}
            style={{ color: c.onForest }}
          >
            {title}
          </Heading>
          <Text small style={{ color: c.onForestMuted, maxWidth: 430 }}>
            {description}
          </Text>
        </View>
        <Image
          accessible={false}
          source={fin}
          resizeMode="contain"
          style={{
            width: compactFin ? 64 : signature ? (wide ? 165 : 98) : wide ? 116 : 82,
            height: compactFin ? 64 : signature ? (wide ? 143 : 98) : wide ? 111 : 82,
          }}
        />
      </View>
      {mode ? (
        <Text small style={{ color: c.onForestMuted, marginTop: 9 }}>
          {mode}
        </Text>
      ) : null}
    </View>
  );
}

export function ModeMark({ label, external = false }: { label: string; external?: boolean }) {
  const { colors: c } = useDesign();
  const Icon = external ? Globe2 : ShieldCheck;
  return (
    <View
      style={{
        gap: 6,
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 99,
        backgroundColor: external ? c.actionBlueSurface : c.secondary,
      }}
    >
      <Icon size={13} color={external ? c.actionBlue : c.success} />
      <Text small bold style={{ color: external ? c.actionBlue : c.primary }}>
        {label}
      </Text>
    </View>
  );
}

export function FinancePrompt({
  label,
  icon,
  onPress,
  external,
  tile = false,
  style,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  external?: boolean;
  tile?: boolean;
  style?: ViewStyle;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      label={label}
      onPress={onPress}
      style={{
        gap: tile ? 9 : 11,
        minHeight: tile ? 102 : 50,
        flexDirection: tile ? 'column' : 'row',
        alignItems: tile ? 'flex-start' : 'center',
        paddingVertical: tile ? 11 : 7,
        paddingHorizontal: 10,
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: tile ? 19 : 13,
        ...style,
      }}
    >
      <View
        style={{
          backgroundColor: tile ? undefined : c.secondary,
          width: tile ? 40 : 31,
          height: tile ? 40 : 31,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text small bold style={{ flex: 1, lineHeight: tile ? 18 : 19 }}>
        {label}
      </Text>
      {tile ? (
        <ArrowUpRight
          size={13}
          color={c.muted}
          style={{ position: 'absolute', right: 8, top: 9 }}
        />
      ) : external ? (
        <ArrowUpRight size={15} color={c.primary} />
      ) : (
        <ChevronRight size={16} color={c.muted} />
      )}
    </Action>
  );
}

type Metric = { label: string; value: string; warning?: boolean };

export function AnalysisLedger({ rows }: { rows: Metric[] }) {
  const { colors: c } = useDesign();
  return (
    <View>
      {rows.map(({ label, value, warning }, index) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            columnGap: 14,
            rowGap: 2,
            paddingVertical: 6,
            borderTopWidth: index ? 1 : 0,
            borderColor: c.border,
          }}
        >
          <Text small muted>
            {label}
          </Text>
          <Text
            small
            bold
            style={{ color: warning ? c.warning : c.foreground, fontVariant: ['tabular-nums'] }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}
