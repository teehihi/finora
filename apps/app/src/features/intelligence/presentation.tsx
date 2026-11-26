import type { ReactNode } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import { ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Action, Heading, Text, useDesign } from '@finora/ui';
import fin from '../../../assets/brand/fin-assistant.png';

export function FinAvatar({ large = false }: { large?: boolean }) {
  const { colors: c } = useDesign();
  const size = large ? 43 : 30;
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
  return (
    <View
      style={{
        minHeight: wide ? 182 : 154,
        borderRadius: 23,
        backgroundColor: c.forest,
        padding: wide ? 22 : 16,
        overflow: 'hidden',
      }}
    >
      {signature ? (
        <View
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            bottom: -13,
            right: -13,
            width: wide ? 340 : 197,
            height: wide ? 211 : 151,
            opacity: 0.25,
          }}
        >
          <Svg viewBox="0 0 222 150" width="100%" height="100%">
            <Path
              fill="none"
              stroke={c.onForestMuted}
              strokeWidth="1.3"
              d="M6 146 C67 119 74 79 152 56 C176 49 201 43 221 20 M31 152 C87 127 95 94 163 74 C190 65 209 59 222 45 M68 150 C100 128 127 111 170 100 C195 93 206 86 221 72"
            />
          </Svg>
        </View>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <Sparkles size={15} color={c.onForest} />
        <Text small bold style={{ color: c.onForest }}>
          {signature
            ? locale === 'vi-VN'
              ? 'TRỢ LÝ VAY & TRẢ NỢ'
              : 'BORROWING AND REPAYMENT'
            : t('ai')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <Heading size={wide ? 32 : 22} style={{ color: c.onForest }}>
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
          style={{ width: wide ? 116 : 82, height: wide ? 111 : 82 }}
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

export function ModeMark({ label }: { label: string }) {
  const { colors: c } = useDesign();
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
        borderRadius: 8,
        backgroundColor: c.secondary,
      }}
    >
      <View style={{ backgroundColor: c.success, width: 6, height: 6, borderRadius: 3 }} />
      <Text small bold style={{ color: c.primary }}>
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
  style,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  external?: boolean;
  style?: ViewStyle;
}) {
  const { colors: c } = useDesign();
  return (
    <Action
      label={label}
      onPress={onPress}
      style={{
        gap: 11,
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 10,
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 13,
        ...style,
      }}
    >
      <View
        style={{
          backgroundColor: c.secondary,
          width: 31,
          height: 31,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text small bold style={{ flex: 1 }}>
        {label}
      </Text>
      {external ? (
        <ArrowUpRight size={15} color={c.primary} />
      ) : (
        <ChevronRight size={16} color={c.muted} />
      )}
    </Action>
  );
}
