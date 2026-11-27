import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import riverside from '../../assets/brand/home-saigon.jpg';

/** Follow positive scroll, but never the negative offset of pull-to-refresh. */
export function HomeBackdrop({
  night,
  height,
  width,
  statusInset,
  surface,
  scrollY,
}: {
  night: boolean;
  height: number;
  width: number;
  statusInset: number;
  surface: string;
  scrollY: Animated.Value;
}) {
  // Keep a single photographic frame at its original aspect ratio. Crop toward
  // the eastern skyline rather than stretching a separate strip of river.
  const photoTop = Math.min(14, statusInset * 0.22);
  const photoWidth = Math.max(width, (height + photoTop) * (1200 / 675));
  const photoHeight = photoWidth * (675 / 1200);
  const fadeTop = Math.min(height * 0.84, photoHeight * 0.86 - photoTop);
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
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: -photoTop,
          left: (width - photoWidth) * 0.83,
          width: photoWidth,
          height: photoHeight,
        }}
      />
      {night && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#10251B88' }]} />}
      <View testID="home-backdrop-fade" style={[styles.layer, { top: fadeTop, bottom: 0 }]}>
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
        <View style={[styles.layer, { top: 0, height: statusInset + 24 }]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="finora-photo-status" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0" stopColor="#14251B" stopOpacity=".63" />
                <Stop
                  offset={statusInset / (statusInset + 24)}
                  stopColor="#14251B"
                  stopOpacity=".58"
                />
                <Stop offset="1" stopColor="#14251B" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#finora-photo-status)" />
          </Svg>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  layer: { position: 'absolute', width: '100%', left: 0 },
});
