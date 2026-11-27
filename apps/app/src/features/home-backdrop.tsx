import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import riverside from '../../assets/brand/home-saigon.jpg';

/** Follow positive scroll, but never the negative offset of pull-to-refresh. */
export function HomeBackdrop({
  night,
  height,
  width,
  cardTop,
  statusInset,
  surface,
  scrollY,
}: {
  night: boolean;
  height: number;
  width: number;
  cardTop: number;
  statusInset: number;
  surface: string;
  scrollY: Animated.Value;
}) {
  // Keep the canopy and skyline above the card. Stretch the reflection band
  // independently so the panorama can fade at the card midpoint.
  const reflectionStart = 0.925;
  const skylineHeight = Math.min(cardTop - 4, statusInset + width * 0.405);
  const skylinePhotoHeight = skylineHeight / reflectionStart;
  const waterPhotoHeight = (height - skylineHeight) / (1 - reflectionStart);
  const fadeTop = Math.max(skylineHeight, cardTop + (height - cardTop) * 0.32);
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
      <View style={[styles.layer, styles.clip, { top: 0, height: skylineHeight }]}>
        <Image
          accessible={false}
          source={riverside}
          fadeDuration={0}
          resizeMode="stretch"
          style={[styles.layer, { top: 0, height: skylinePhotoHeight }]}
        />
      </View>
      <View
        testID="home-backdrop-reflections"
        style={[styles.layer, styles.clip, { top: skylineHeight, bottom: 0 }]}
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
      <View style={[styles.layer, { top: fadeTop, bottom: 0 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="finora-photo-bottom" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor={surface} stopOpacity="0" />
              <Stop offset=".45" stopColor={surface} stopOpacity=".28" />
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
  clip: { overflow: 'hidden' },
  layer: { position: 'absolute', width: '100%', left: 0 },
});
