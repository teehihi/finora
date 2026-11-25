import { View, useWindowDimensions } from 'react-native';
import { Text, useDesign } from '@finora/ui';
import { tokens } from '@finora/design-tokens';

const ledger = ['authEditorialPrincipal', 'authEditorialCost', 'authEditorialSchedule'] as const;

export function AuthArtwork({
  wide,
  verification = false,
}: {
  wide: boolean;
  verification?: boolean;
}) {
  const { colors: c, locale, t } = useDesign();
  const { width } = useWindowDimensions();
  const editorialSize = width >= 1280 ? 57 : 43;
  if (!wide)
    return (
      <View style={{ gap: 6, paddingBottom: 15, borderBottomWidth: 1, borderColor: c.border }}>
        <Text bold style={{ fontSize: 10, lineHeight: 16, letterSpacing: 1.5, color: c.muted }}>
          {t(verification ? 'authOtpStep' : 'authEditorialLabel')}
        </Text>
        {!verification ? (
          <Text style={{ fontSize: 15, color: c.primary }}>{t('welcome').replace('\n', ' ')}</Text>
        ) : null}
      </View>
    );
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 520,
        padding: width >= 1280 ? 44 : 28,
        borderRadius: 20,
        backgroundColor: c.forest,
        justifyContent: 'space-between',
        gap: 31,
      }}
    >
      <View style={{ gap: 19 }}>
        <Text
          bold
          style={{ color: c.onForestMuted, fontSize: 11, lineHeight: 16, letterSpacing: 2 }}
        >
          {t('authEditorialLabel')}
        </Text>
        <Text
          style={{
            color: c.onForest,
            fontFamily: locale === 'vi-VN' ? tokens.font.serifVi : tokens.font.serifEn,
            fontSize: editorialSize,
            lineHeight: Math.ceil(editorialSize * 1.14),
            letterSpacing: -editorialSize * 0.034,
            maxWidth: 510,
          }}
        >
          {t('welcome')}
        </Text>
        <Text style={{ color: c.onForestMuted, maxWidth: 330, lineHeight: 24 }}>
          {t('authEditorialNote')}
        </Text>
      </View>
      <View accessibilityRole="list">
        {ledger.map((label, index) => (
          <View
            accessibilityRole="listitem"
            key={label}
            style={{
              borderTopWidth: 1,
              borderColor: 'rgba(218,229,217,0.25)',
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 20,
              paddingVertical: 13,
            }}
          >
            <Text
              style={{
                color: c.onForestMuted,
                fontSize: 11,
                fontVariant: ['tabular-nums'],
                letterSpacing: 1,
              }}
            >
              0{index + 1}
            </Text>
            <Text style={{ color: c.onForest, flex: 1 }}>{t(label)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
