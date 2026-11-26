import { StyleSheet, View } from 'react-native';
import type { ComponentRef, RefObject } from 'react';
import { LiquidGlassContainerView, LiquidGlassView } from '@callstack/liquid-glass';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useDesign } from '@finora/ui';
import PlatformGlassSurface from './PlatformGlassSurface';

export const dockHeight = 80;
export const dockOffset = 8;

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
  const scheme = isDark ? 'dark' : 'light';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {nativeGlass ? (
        <LiquidGlassContainerView spacing={16} style={StyleSheet.absoluteFill}>
          <LiquidGlassView
            effect="regular"
            colorScheme={scheme}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 61,
              borderRadius: 28,
            }}
          />
          <LiquidGlassView
            effect="regular"
            colorScheme={scheme}
            style={{
              position: 'absolute',
              left: '50%',
              marginLeft: -33,
              top: 0,
              width: 66,
              height: 65,
              borderRadius: 30,
            }}
          />
        </LiquidGlassContainerView>
      ) : (
        <>
          <PlatformGlassSurface
            isDark={isDark}
            blurTarget={blurTarget}
            children={null}
            surfaceColor={colors.surface}
            borderColor="transparent"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 2,
              right: 2,
              height: 59,
              borderRadius: 28,
              borderWidth: 0,
            }}
          />
          <Svg width="100%" height="100%" viewBox="0 0 364 80" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="finora-dock-surface" x1="0" x2="0" y1="0" y2="100%">
                <Stop offset="0" stopColor={colors.surface} stopOpacity={0.98} />
                <Stop offset="1" stopColor={colors.secondary} stopOpacity={isDark ? 0.86 : 0.53} />
              </LinearGradient>
            </Defs>
            <Path
              d="M28 20h99c14 0 21-3 30-11C165 3 173 1 182 1s17 2 25 8c9 8 16 11 30 11h99c15 0 27 12 27 27v5c0 15-12 27-27 27H28C13 79 1 67 1 52v-5c0-15 12-27 27-27Z"
              fill="url(#finora-dock-surface)"
              stroke={colors.border}
              strokeWidth={1}
            />
          </Svg>
        </>
      )}
    </View>
  );
}
