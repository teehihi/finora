import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type HomeTool = 'simulate' | 'schedule' | 'compare' | 'contract';

const palette = {
  light: {
    simulate: { solid: '#5844AA', ink: '#403384', soft: '#E9E2FC', paper: '#FFFFFF' },
    schedule: { solid: '#246AAF', ink: '#18578D', soft: '#DDEFFA', paper: '#FFFFFF' },
    compare: { solid: '#A85820', ink: '#854215', soft: '#FFE7CC', paper: '#FFFFFF' },
    contract: { solid: '#1A775E', ink: '#126149', soft: '#D9F0E5', paper: '#FFFFFF' },
  },
  dark: {
    simulate: { solid: '#8B78D5', ink: '#EEE7FF', soft: '#D8C9FA', paper: '#34265B' },
    schedule: { solid: '#5695D1', ink: '#D9EFFC', soft: '#BFE1F6', paper: '#17324C' },
    compare: { solid: '#C88550', ink: '#FFE8C8', soft: '#F3CDA2', paper: '#482812' },
    contract: { solid: '#55A58A', ink: '#E0F9EB', soft: '#B8E1D2', paper: '#173B31' },
  },
} as const;

type Ink = (typeof palette)[keyof typeof palette][HomeTool];

function artwork(tool: HomeTool, { solid, ink, soft, paper }: Ink, night: boolean) {
  switch (tool) {
    case 'simulate':
      return (
        <>
          <Rect x={11} y={6} width={26} height={36} rx={5} fill={solid} />
          <Rect x={16} y={11} width={16} height={8} rx={1.5} fill={soft} />
          <Path d="M24.5 15h4" stroke={night ? paper : ink} strokeWidth={1.8} />
          <Rect x={16} y={23} width={5.5} height={5} rx={1.2} fill={paper} />
          <Rect x={26.5} y={23} width={5.5} height={5} rx={1.2} fill={paper} />
          <Rect x={16} y={32} width={5.5} height={5} rx={1.2} fill={paper} />
          <Rect x={26.5} y={32} width={5.5} height={5} rx={1.2} fill={soft} />
        </>
      );
    case 'schedule':
      return (
        <>
          <Rect x={6} y={10} width={31} height={28} rx={4.5} fill={solid} />
          <Path d="M7.5 20h28v13.5a3 3 0 0 1-3 3h-22a3 3 0 0 1-3-3V20Z" fill={soft} />
          <Path d="M14 7v8m15-8v8" stroke={ink} strokeWidth={2.8} />
          <Path d="M13 25h4m5 0h4m-13 6h4" stroke={night ? paper : ink} strokeWidth={2} />
          <Circle
            cx={33.5}
            cy={33.5}
            r={9}
            fill={paper}
            stroke={night ? ink : solid}
            strokeWidth={2.2}
          />
          <Path d="M33.5 29v4.8h3.4" stroke={night ? ink : solid} strokeWidth={2} />
        </>
      );
    case 'compare':
      return (
        <>
          <Rect x={5} y={10} width={17} height={28} rx={3.2} fill={soft} />
          <Rect x={26} y={10} width={17} height={28} rx={3.2} fill={solid} />
          <Path d="M9.5 17h8m-8 5h5" stroke={night ? paper : ink} strokeWidth={2} />
          <Path d="M30.5 17h8m-8 5h5" stroke={paper} strokeWidth={2} />
          <Rect x={9.5} y={30} width={8} height={3.5} rx={1.1} fill={night ? paper : ink} />
          <Rect x={30.5} y={27} width={8} height={6.5} rx={1.1} fill={paper} />
        </>
      );
    case 'contract':
      return (
        <>
          <Path
            d="M10 6.5h15l8 8v22a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-26a4 4 0 0 1 4-4Z"
            fill={solid}
          />
          <Path d="M25 6.5v7a1 1 0 0 0 1 1h7Z" fill={soft} />
          <Path d="M12 19.5h14m-14 5.5h8m-8 7h6" stroke={paper} strokeWidth={2} />
          <Path
            d="m36.1 20.7 4.8 4.8-12.4 12.4-6.6 1.7 1.8-6.5 12.4-12.4Z"
            fill={soft}
            stroke={night ? paper : ink}
            strokeWidth={1.6}
          />
          <Path d="m33.2 23.6 4.8 4.8" stroke={night ? paper : ink} strokeWidth={1.6} />
        </>
      );
  }
}

export function HomeToolIcon({ tool, night }: { tool: HomeTool; night: boolean }) {
  const inks = palette[night ? 'dark' : 'light'][tool];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 46, height: 46 }}
    >
      <Svg
        width={46}
        height={46}
        viewBox="0 0 48 48"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {artwork(tool, inks, night)}
      </Svg>
    </View>
  );
}
