import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Conservative until the platform responds; all screens share one subscription.
let reduced = true;
let stop: (() => void) | undefined;
const listeners = new Set<() => void>();
function update(value: boolean) {
  if (reduced === value) return;
  reduced = value;
  listeners.forEach((notify) => notify());
}
function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) {
    if (Platform.OS === 'web') {
      const media =
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (media) {
        const read = () => update(media.matches);
        media.addEventListener('change', read);
        read();
        stop = () => media.removeEventListener('change', read);
      }
    } else {
      let current = true;
      let changed = false;
      const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
        changed = true;
        update(value);
      });
      void AccessibilityInfo.isReduceMotionEnabled().then(
        (value) => {
          if (current && !changed) update(value);
        },
        () => {},
      );
      stop = () => {
        current = false;
        sub.remove();
      };
    }
  }
  return () => {
    listeners.delete(notify);
    if (!listeners.size) {
      stop?.();
      stop = undefined;
      reduced = true;
    }
  };
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => reduced,
    () => true,
  );
}
export function overlayMotion(bottom: boolean, reducedMotion: boolean, platform: string) {
  return reducedMotion || platform === 'web' ? 'none' : bottom ? 'slide' : 'fade';
}
