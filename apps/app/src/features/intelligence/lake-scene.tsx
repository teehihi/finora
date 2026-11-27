import { useId, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { dark } from '@finora/design-tokens';
import { useDesign } from '@finora/ui';
import lake from '../../../assets/scenes/ho-guom.png';

export function LakeScene({ reading, dockInset }: { reading: boolean; dockInset: number }) {
  const { colors } = useDesign();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const fadeId = 'lake-fade-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const bottom = Math.round(dockInset * 0.55);
  // Cover from the lower right so the tower stays in view on wide and narrow screens.
  const width = Math.max(frame.width, (frame.height - bottom) * (1086 / 1448));
  const night = colors === dark;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent: { layout } }) =>
        setFrame((current) => ({
          width: layout.width,
          height:
            current.height === 0 || current.width !== layout.width ? layout.height : current.height,
        }))
      }
      style={[StyleSheet.absoluteFill, { overflow: 'visible', backgroundColor: colors.background }]}
    >
      {frame.height > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: frame.height,
            overflow: 'hidden',
          }}
        >
          {width > 0 ? (
            <Image
              accessible={false}
              source={lake}
              resizeMode="cover"
              style={{
                position: 'absolute',
                bottom,
                right: (frame.width - width) * 0.15,
                width,
                height: width * (1448 / 1086),
                opacity: reading ? (night ? 0.07 : 0.14) : night ? 0.21 : 0.91,
              }}
            />
          ) : null}
          {!reading && !night ? (
            <Svg width="100%" height="46%" style={{ position: 'absolute', top: 0 }}>
              <Defs>
                <LinearGradient id={fadeId + '-sky'} x1="0" y1="0" x2="0" y2="100%">
                  <Stop offset="0" stopColor={colors.background} stopOpacity={0.3} />
                  <Stop offset="0.45" stopColor={colors.background} stopOpacity={0.72} />
                  <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={'url(#' + fadeId + '-sky)'} />
            </Svg>
          ) : null}
          {bottom > 0 ? (
            <Svg width="100%" height={bottom} style={{ position: 'absolute', bottom }}>
              <Defs>
                <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="100%">
                  <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
                  <Stop offset="1" stopColor={colors.background} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={'url(#' + fadeId + ')'} />
            </Svg>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
