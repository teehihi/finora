import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { dark } from '@finora/design-tokens';
import { useDesign } from '@finora/ui';
import markLight from '../../assets/brand/lockup.png';
import markDark from '../../assets/brand/lockup-night.png';
import palette from './launch-palette.json';
import { usePulse } from './task-surface';
import fin from '../../assets/brand/fin-login.png';

// Still intaglio curves, not moving background layers. Only one small pill animates.
const curves = Array.from(
  { length: 12 },
  (_, i) =>
    `M-50 ${70 + i * 7} C70 ${-12 + i * 9} 111 ${190 + i * 7} 251 ${110 + i * 4} S413 ${20 + i * 2} 456 ${42 + i * 5}`,
).join(' ');

export function LaunchScene({ checking = false }: { checking?: boolean }) {
  const { t, locale, colors } = useDesign();
  const night = colors === dark;
  const pulse = usePulse();
  const label = checking
    ? t('authChecking')
    : locale === 'vi-VN'
      ? 'Đang mở Finora'
      : 'Opening Finora';
  const ink = night ? '#AFE7CD' : '#064B36';
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      testID="finora-launch"
      style={[styles.scene, { backgroundColor: night ? palette.dark : palette.light }]}
    >
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.landscape}
      >
        <Svg width="100%" height="100%" viewBox="0 0 390 230" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="launchMist" x1="0" y1="0" x2="0.13" y2="1">
              <Stop offset="0" stopColor={ink} stopOpacity="0" />
              <Stop offset="1" stopColor={ink} stopOpacity={night ? 0.075 : 0.085} />
            </LinearGradient>
          </Defs>
          <Rect width="390" height="230" fill="url(#launchMist)" />
          <Path
            d={curves}
            stroke={ink}
            strokeOpacity={night ? 0.11 : 0.09}
            strokeWidth="0.8"
            fill="none"
          />
        </Svg>
      </View>
      <Image
        accessible={false}
        source={fin}
        resizeMode="contain"
        style={{
          position: 'absolute',
          bottom: -12,
          width: 198,
          height: 166,
          alignSelf: 'center',
          opacity: night ? 0.88 : 1,
        }}
      />
      <Image
        accessible={false}
        source={night ? markDark : markLight}
        resizeMode="contain"
        style={{ width: palette.markWidth, height: palette.markWidth }}
      />
      <View style={styles.below}>
        <Text style={[styles.caption, { color: ink }]}>{label}</Text>
        <Animated.View
          testID="launch-pulse"
          style={[styles.pill, { backgroundColor: ink, opacity: pulse }]}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  landscape: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '32%', maxHeight: 310 },
  below: {
    position: 'absolute',
    top: '50%',
    marginTop: 53,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  caption: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
  pill: { width: 24, height: 3, borderRadius: 3 },
});
