import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// A quiet line treatment borrowed from the arc of the Finora leaf, not a chart.
export function BrandLines({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', right: -14, top: -11, width: '58%', height: 190, opacity }}
    >
      <Svg viewBox="0 0 248 176" width="100%" height="100%" preserveAspectRatio="xMaxYMin meet">
        <Path
          d="M2 169C65 76 111 105 166 34c21-27 48-33 81-33M37 176c55-72 119-64 164-126 13-19 28-28 46-33M82 176c57-48 107-45 139-99 7-11 16-22 26-27M131 176c37-18 89-40 116-87M209 176c13-15 26-27 38-50"
          stroke="#CBF0A4"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}
