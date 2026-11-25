import { BlurView } from 'expo-blur';
import type { PlatformGlassSurfaceProps } from './PlatformGlassSurface';

export default function PlatformGlassSurface({
  children,
  isDark,
  blurTarget,
  borderColor,
  style,
}: PlatformGlassSurfaceProps) {
  return (
    <BlurView
      intensity={72}
      tint={isDark ? 'dark' : 'light'}
      blurReductionFactor={2}
      blurMethod="dimezisBlurViewSdk31Plus"
      blurTarget={blurTarget}
      style={[
        {
          backgroundColor: isDark ? 'rgba(24, 35, 29, 0.46)' : 'rgba(247, 245, 239, 0.46)',
          borderColor,
          borderWidth: 1,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
