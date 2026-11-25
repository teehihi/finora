import { BlurView } from 'expo-blur';
import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';
import type { PlatformGlassSurfaceProps } from './PlatformGlassSurface';

const border = { borderWidth: 1, overflow: 'hidden' as const };

export default function PlatformGlassSurface({
  children,
  isDark,
  borderColor: tokenBorderColor,
  style,
}: PlatformGlassSurfaceProps) {
  const tint = isDark ? 'rgba(23, 61, 50, 0.16)' : 'rgba(255, 255, 255, 0.12)';
  const borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.56)';

  if (isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        effect="regular"
        interactive
        colorScheme={isDark ? 'dark' : 'light'}
        tintColor={tint}
        style={[border, { borderColor }, style]}
      >
        {children}
      </LiquidGlassView>
    );
  }

  return (
    <BlurView
      intensity={58}
      tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
      style={[
        border,
        { borderColor: tokenBorderColor ?? borderColor, backgroundColor: tint },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
