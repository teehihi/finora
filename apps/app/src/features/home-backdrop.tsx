import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import riverside from '../../assets/brand/home-saigon.jpg';

// Fit the whole skyline horizontally. The repayment card can move without
// zooming and cutting off the edge of the panorama to fill its height.
const waterStart = 0.93;

export function homePanorama(width: number, height: number, cardTop: number) {
  const photoHeight = Math.min(height - 2, Math.max(width * 0.45, (cardTop + 5) / 0.86));
  const waterTop = Math.round(photoHeight * waterStart);
  const fadeTop = Math.min(waterTop, Math.max(cardTop + 10, height - 85));
  return {
    photoHeight: waterTop / waterStart,
    waterTop,
    waterPhotoHeight: (height - waterTop) / (1 - waterStart),
    fadeTop,
  };
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
  const { photoHeight, waterTop, waterPhotoHeight, fadeTop } = homePanorama(width, height, cardTop);
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
      <View style={[styles.layer, styles.clip, { top: 0, height: waterTop + 1 }]}>
        <Image
          accessible={false}
          source={riverside}
          fadeDuration={0}
          resizeMode="stretch"
          style={[styles.layer, { top: 0, height: photoHeight }]}
        />
      </View>
      {/* Extend the bottom reflections only, so a taller card never zooms the skyline. */}
      <View
        testID="home-photo-reflections"
        style={[styles.layer, styles.clip, { top: waterTop, bottom: 0 }]}
      >
        <Image
          accessible={false}
          source={riverside}
          fadeDuration={0}
          resizeMode="stretch"
          style={[styles.layer, { bottom: 0, height: waterPhotoHeight }]}
        />
      </View>
      {night && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#10251B88' }]} />}
      <View testID="home-photo-blend" style={[styles.layer, { top: fadeTop, bottom: 0 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="finora-photo-bottom" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor={surface} stopOpacity="0" />
              <Stop offset=".28" stopColor={surface} stopOpacity=".08" />
              <Stop offset=".62" stopColor={surface} stopOpacity=".60" />
              <Stop offset="1" stopColor={surface} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#finora-photo-bottom)" />
        </Svg>
      </View>
      {statusInset > 0 && (
        <View style={[styles.layer, { top: 0, height: statusInset + 10 }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="finora-status-start" cx="14%" cy="37%" rx="35%" ry="85%">
                <Stop offset="0" stopColor="#11261A" stopOpacity=".55" />
                <Stop offset="1" stopColor="#11261A" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="finora-status-end" cx="86%" cy="37%" rx="35%" ry="85%">
                <Stop offset="0" stopColor="#11261A" stopOpacity=".55" />
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
