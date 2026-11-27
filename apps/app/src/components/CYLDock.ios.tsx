import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import type { CYLDockProps } from './CYLDock';

type NativeProps = ViewProps & {
  titles: string[];
  selectedIndex: number;
  routeKey: string;
  scrollTarget: string;
  compact: boolean;
  dark: boolean;
  primaryColor: string;
  onTabSelect: (event: NativeSyntheticEvent<{ index: number; identifier: string }>) => void;
  onDockHeight: (event: NativeSyntheticEvent<{ height: number }>) => void;
};

// Older development binaries can still load the bundle and use the fallback.
const nativeDock = requireOptionalNativeModule<{ isLiquidGlassActive: boolean }>('FinoraCYLDock');
const Bar =
  nativeDock?.isLiquidGlassActive === true
    ? requireNativeView<NativeProps>('FinoraCYLDock')
    : undefined;
export const cylDockAvailable = !!Bar;

export default function CYLDock(props: CYLDockProps) {
  if (!Bar) return null;
  return (
    <Bar
      testID="finora-cyl-dock"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: props.height }}
      titles={props.titles}
      selectedIndex={props.selectedIndex}
      compact={props.compact}
      dark={props.dark}
      primaryColor={props.primaryColor}
      routeKey={props.routeKey}
      scrollTarget={props.scrollTarget ?? ''}
      onTabSelect={({ nativeEvent }) => props.onSelect(nativeEvent.index, nativeEvent.identifier)}
      onDockHeight={({ nativeEvent: { height } }) => {
        if (Number.isFinite(height) && height > 0) props.onHeight(Math.ceil(height));
      }}
    />
  );
}
