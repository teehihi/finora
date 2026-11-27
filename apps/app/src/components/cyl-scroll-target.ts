import { useFocusEffect, usePathname } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { pilotDockAvailable } from './CYLDockPilot';
import { initialCYLScroll, nextCYLScroll } from './cyl-dock-scroll';

export const cylScrollTarget = (path: string) => 'finora-cyl-primary-scroll:' + path;

export const CYLScrollContext = createContext<
  ((path: string, compact: boolean) => void) | undefined
>(undefined);

// Only the focused screen may drive the dock. Send a state change, not a frame stream.
export function useCYLScrollTarget() {
  const path = usePathname();
  const report = useContext(CYLScrollContext);
  const [focusedTarget, setFocusedTarget] = useState<string>();
  const active = useRef(false);
  const dragging = useRef(false);
  const position = useRef(initialCYLScroll);
  useFocusEffect(
    useCallback(() => {
      if (!report || !pilotDockAvailable) return;
      const target = cylScrollTarget(path);
      active.current = true;
      dragging.current = false;
      position.current = initialCYLScroll;
      report(path, false);
      setFocusedTarget(target);
      return () => {
        active.current = false;
        dragging.current = false;
        report(path, false);
        setFocusedTarget(undefined);
      };
    }, [path, report]),
  );

  if (!focusedTarget || focusedTarget !== cylScrollTarget(path)) return undefined;
  function track({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>, resetTravel = false) {
    if (!active.current) return;
    const { contentOffset, contentSize, layoutMeasurement, contentInset } = nativeEvent;
    const previous = position.current;
    const next = nextCYLScroll(resetTravel ? { ...previous, travel: 0 } : previous, {
      y: contentOffset.y,
      top: -(contentInset?.top ?? 0),
      bottom: contentSize.height - layoutMeasurement.height + (contentInset?.bottom ?? 0),
      dragging: dragging.current && !resetTravel,
    });
    position.current = next;
    if (next.compact !== previous.compact) report?.(path, next.compact);
  }

  return {
    testID: focusedTarget,
    scrollEventThrottle: 32,
    onScroll: track,
    onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      dragging.current = true;
      track(event, true);
    },
    onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      track(event);
      dragging.current = false;
    },
  };
}
