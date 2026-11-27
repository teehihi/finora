import { StyleSheet, View } from 'react-native';
import type { ComponentRef, RefObject } from 'react';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useDesign } from '@finora/ui';
import PlatformGlassSurface from './PlatformGlassSurface';

export const dockHeight = 63;
export const dockOffset = 8;
export const dockGlassEffect = 'clear';

const surface = { ...StyleSheet.absoluteFill, borderRadius: 30, overflow: 'hidden' } as const;

export function DockChrome({
  nativeGlass,
  isDark,
  blurTarget,
}: {
  nativeGlass: boolean;
  isDark: boolean;
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
}) {
  const { colors } = useDesign();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {nativeGlass ? (
        <LiquidGlassView
          effect={dockGlassEffect}
          colorScheme={isDark ? 'dark' : 'light'}
          style={surface}
        />
      ) : (
        <PlatformGlassSurface
          isDark={isDark}
          blurTarget={blurTarget}
          surfaceColor={colors.surface}
          borderColor={colors.border}
          style={{ ...surface, borderWidth: 1 }}
        >
          {null}
        </PlatformGlassSurface>
      )}
    </View>
  );
}
