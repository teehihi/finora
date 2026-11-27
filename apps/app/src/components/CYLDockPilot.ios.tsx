import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import type { CYLDockProps } from './CYLDockPilot';

type NativeProps = ViewProps & {
  titles: string[];
  selectedIndex: number;
  routeKey: string;
  scrollTarget: string;
  dark: boolean;
  onTabSelect: (event: NativeSyntheticEvent<{ index: number; identifier: string }>) => void;
  onDockHeight: (event: NativeSyntheticEvent<{ height: number }>) => void;
};

const enabled =
  __DEV__ &&
  process.env.EXPO_PUBLIC_FINORA_DOCK === 'cyl' &&
  !!requireOptionalNativeModule('FinoraCYLDock');
const Bar = enabled ? requireNativeView<NativeProps>('FinoraCYLDock') : undefined;
export const pilotDockAvailable = !!Bar;

export default function CYLDockPilot(props: CYLDockProps) {
  if (!Bar) return null;
  return (
    <Bar
      testID="finora-cyl-pilot"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: props.height }}
      titles={props.titles}
      selectedIndex={props.selectedIndex}
      dark={props.dark}
      routeKey={props.routeKey}
      scrollTarget={props.scrollTarget ?? ''}
      onTabSelect={({ nativeEvent }) => props.onSelect(nativeEvent.index, nativeEvent.identifier)}
      onDockHeight={({ nativeEvent: { height } }) => {
        if (Number.isFinite(height) && height > 0) props.onHeight(Math.ceil(height));
      }}
    />
  );
}
