import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export type HomeTool = 'simulate' | 'schedule' | 'compare' | 'contract';

const palette = {
  light: {
    simulate: { ink: '#4D44A6', tile: '#EFECFB' },
    schedule: { ink: '#18588B', tile: '#E5F1FB' },
    compare: { ink: '#8B4F0D', tile: '#FCF0DE' },
    contract: { ink: '#166651', tile: '#E3F3EB' },
  },
  dark: {
    simulate: { ink: '#C9C0FA', tile: '#2E2946' },
    schedule: { ink: '#AAD8FC', tile: '#20384B' },
    compare: { ink: '#F1C786', tile: '#443521' },
    contract: { ink: '#9BDFC3', tile: '#223D34' },
  },
} as const;

const marks = {
  simulate: (
    <>
      <Rect x="5" y="3" width="14" height="18" rx="2.3" />
      <Path d="M8.5 7.5h7M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2" />
    </>
  ),
  schedule: (
    <>
      <Rect x="3.5" y="5.5" width="17" height="15.5" rx="2.4" />
      <Path d="M7.5 3v5m9-5v5m-13 2h17m-12 5.2 2.1 2.1 4.3-4.3" />
    </>
  ),
  compare: (
    <>
      <Rect x="3" y="5.5" width="7" height="13" rx="1.6" />
      <Rect x="14" y="5.5" width="7" height="13" rx="1.6" />
      <Path d="M5.5 10h2m-2 4h2m9-4h2m-2 4h2" />
    </>
  ),
  contract: (
    <>
      <Path d="M18.5 12V7.5l-4-4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4m3.5-17v4h4m-10 3h6m-6 3.5H11" />
      <Path d="m14 18 4.8-4.8 2 2L16 20l-3 .9 1-2.9Z" />
    </>
  ),
} as const;

export function HomeToolIcon({ tool, night }: { tool: HomeTool; night: boolean }) {
  const { ink, tile } = palette[night ? 'dark' : 'light'][tool];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: tile,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={25}
        height={25}
        viewBox="0 0 24 24"
        fill="none"
        stroke={ink}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {marks[tool]}
      </Svg>
    </View>
  );
}
