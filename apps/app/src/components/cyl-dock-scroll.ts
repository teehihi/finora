export const initialCYLScroll = { y: 0, travel: 0, compact: false };

export function nextCYLScroll(
  state: typeof initialCYLScroll,
  sample: { y: number; top: number; bottom: number; dragging: boolean },
) {
  const range = Math.max(0, sample.bottom - sample.top);
  const y = Math.max(0, Math.min(range, sample.y - sample.top));
  if (range < 80 || y <= 4) return { y, travel: 0, compact: false };
  if (!sample.dragging) return { ...state, y, travel: 0 };

  const delta = y - state.y;
  const travel =
    delta === 0
      ? state.travel
      : Math.sign(delta) === Math.sign(state.travel)
        ? state.travel + delta
        : delta;
  if (!state.compact && y >= 36 && travel >= 18) return { y, travel: 0, compact: true };
  if (state.compact && travel <= -12) return { y, travel: 0, compact: false };
  return { y, travel: Math.max(-18, Math.min(18, travel)), compact: state.compact };
}
