import type { ComponentRef, ReactNode, RefObject } from 'react';
import { View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

export type PlatformGlassSurfaceProps = {
  children: ReactNode;
  isDark: boolean;
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
  surfaceColor: ColorValue;
  borderColor: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export default function PlatformGlassSurface({
  children,
  surfaceColor,
  borderColor,
  style,
}: PlatformGlassSurfaceProps) {
  return (
    <View
      style={[
        {
          backgroundColor: surfaceColor,
          borderColor,
          borderWidth: 1,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
