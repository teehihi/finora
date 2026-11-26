import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@finora/design-tokens';
import { useDesign } from '@finora/ui';

export type SignatureTone = 'emerald' | 'blue' | 'amber' | 'violet' | 'lime';

export function SignatureIcon({
  icon: Icon,
  tone = 'emerald',
  size = tokens.signature.icon as number,
  style,
}: {
  icon: LucideIcon;
  tone?: SignatureTone;
  size?: number;
  style?: ViewStyle;
}) {
  const { colors: c } = useDesign();
  const [ink, surface] = {
    emerald: [c.primary, c.secondary],
    blue: [c.actionBlue, c.actionBlueSurface],
    amber: [c.actionAmber, c.actionAmberSurface],
    violet: [c.actionViolet, c.actionVioletSurface],
    lime: [c.signatureInk, c.signatureLime],
  }[tone];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.31),
          backgroundColor: surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={ink} strokeWidth={1.8} />
    </View>
  );
}

// Decorative original leaf contours, outside touch and accessibility trees.
export function SignatureSweep({ name }: { name: string }) {
  const { colors: c } = useDesign();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 420 300">
        <Defs>
          <LinearGradient id={name} x1="0%" y1="0%" x2="100%" y2="95%">
            <Stop offset="0" stopColor={c.signatureStart} />
            <Stop offset="1" stopColor={c.signatureEnd} />
          </LinearGradient>
        </Defs>
        <Rect width="420" height="300" fill={'url(#' + name + ')'} />
        <Path
          d="M435 -29C361 30 250 14 230 126C304 99 385 141 435 81ZM431 3C372 58 284 38 246 112M435 89C352 150 318 123 295 239C365 213 410 214 438 168M441 123C397 169 344 153 310 216"
          fill="none"
          stroke={c.signatureEdge}
          strokeWidth="1"
          opacity={0.62}
        />
      </Svg>
    </View>
  );
}
