import { useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useState } from 'react';
import { pilotDockAvailable } from './CYLDockPilot';

export const cylScrollTarget = (path: string) => 'finora-cyl-primary-scroll:' + path;

// Only the primary scroll view of the focused screen may drive the pilot's
// tab bar. Hidden stack screens (notably an old Home) must not still bind.
export function useCYLScrollTarget() {
  const path = usePathname();
  const [focusedTarget, setFocusedTarget] = useState<string>();
  useFocusEffect(
    useCallback(() => {
      if (!pilotDockAvailable) return;
      setFocusedTarget(cylScrollTarget(path));
      return () => setFocusedTarget(undefined);
    }, [path]),
  );
  return pilotDockAvailable ? focusedTarget : undefined;
}
