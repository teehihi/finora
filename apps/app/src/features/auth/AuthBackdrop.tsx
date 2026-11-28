import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useDesign } from '@finora/ui';

export function AuthBackdrop() {
  const { colors: c } = useDesign();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="authAmbientTop" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.secondary} stopOpacity="0.24" />
            <Stop offset="1" stopColor={c.secondary} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="authAmbientBottom" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.secondary} stopOpacity="0" />
            <Stop offset="1" stopColor={c.secondary} stopOpacity="0.28" />
          </LinearGradient>
        </Defs>
        <Path d="M0 0H145C98 38 76 88 0 95Z" fill="url(#authAmbientTop)" />
        <Path d="M390 0H270C316 40 339 72 390 84Z" fill="url(#authAmbientTop)" />
        <Path d="M0 700C83 735 123 667 216 718S327 735 390 690V844H0Z" fill="url(#authAmbientBottom)" />
        <Path
          d="M-10 790C88 738 145 820 235 777S336 769 403 738"
          stroke={c.primary}
          strokeOpacity="0.1"
          strokeWidth="1"
          fill="none"
        />
      </Svg>
    </View>
  );
}
