import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import riverside from '../../assets/brand/home-saigon.jpg';

// Fit the whole skyline horizontally. The repayment card can move without
// zooming and cutting off the edge of the panorama to fill its height.
export function homePanorama(width: number, height: number, cardTop: number) {
  const photoHeight = Math.floor(
    Math.min(height - 2, Math.max(width * 0.45, (cardTop + 5) / 0.86)),
  );
  const waterBand = Math.max(10, Math.round(photoHeight * 0.1));
  const fadeLength = Math.max(14, Math.min(26, Math.round((height - cardTop) * 0.27)));
  const fadeTop = height - fadeLength;
  return { photoHeight, waterBand, fadeTop };
}

/** Follow positive scroll, but never the negative offset of pull-to-refresh. */
export function HomeBackdrop({
  night,
  height,
  cardTop,
  width,
  statusInset,
  surface,
  scrollY,
}: {
  night: boolean;
  height: number;
  cardTop: number;
  width: number;
  statusInset: number;
  surface: string;
  scrollY: Animated.Value;
}) {
  const { photoHeight, waterBand, fadeTop } = homePanorama(width, height, cardTop);
  const reflectionHeight = height - photoHeight;
  const bands = Math.ceil(reflectionHeight / waterBand);
  const translateY = scrollY.interpolate({
    inputRange: [0, height],
    outputRange: [0, -height],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      testID="home-fixed-backdrop"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.backdrop, { height, transform: [{ translateY }] }]}
    >
      <Image
        accessible={false}
        source={riverside}
        fadeDuration={0}
        resizeMode="stretch"
        style={[styles.layer, { top: 0, height: photoHeight }]}
      />
      {/* Mirror the existing bottom ripples at their original scale, not a vertically stretched crop. */}
      <View
        testID="home-photo-reflections"
        style={[styles.layer, styles.clip, { top: photoHeight, bottom: 0 }]}
      >
        {Array.from({ length: bands }, (_, index) => {
          const flipped = index % 2 === 0;
          return (
            <View
              key={index}
              style={[styles.layer, styles.clip, { top: index * waterBand, height: waterBand }]}
            >
              <Image
                accessible={false}
                source={riverside}
                fadeDuration={0}
                resizeMode="stretch"
                style={[
                  styles.layer,
                  {
                    top: flipped ? 0 : waterBand - photoHeight,
                    height: photoHeight,
                    transform: [{ scaleY: flipped ? -1 : 1 }],
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      {night && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#10251B88' }]} />}
      <View testID="home-photo-blend" style={[styles.layer, { top: fadeTop, bottom: 0 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="finora-photo-bottom" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor={surface} stopOpacity="0" />
              <Stop offset=".40" stopColor={surface} stopOpacity=".14" />
              <Stop offset=".73" stopColor={surface} stopOpacity=".65" />
              <Stop offset="1" stopColor={surface} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#finora-photo-bottom)" />
        </Svg>
      </View>
      {statusInset > 0 && (
        <View style={[styles.layer, { top: 0, height: statusInset + 3 }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="finora-status-start" cx="14%" cy="37%" rx="35%" ry="56%">
                <Stop offset="0" stopColor="#11261A" stopOpacity=".47" />
                <Stop offset="1" stopColor="#11261A" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="finora-status-end" cx="86%" cy="37%" rx="35%" ry="56%">
                <Stop offset="0" stopColor="#11261A" stopOpacity=".47" />
                <Stop offset="1" stopColor="#11261A" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#finora-status-start)" />
            <Rect width="100%" height="100%" fill="url(#finora-status-end)" />
          </Svg>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  clip: { overflow: 'hidden' },
  layer: { position: 'absolute', width: '100%', left: 0 },
});
