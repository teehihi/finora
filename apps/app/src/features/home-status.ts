/** The status icons sample the fading photograph part-way down the safe area. */
export function homeStatusTransition(heroHeight: number, safeTop: number, fadeTop: number) {
  const backingStart = Math.max(0, fadeTop - safeTop * 0.55);
  const backingEnd = Math.max(backingStart + 1, heroHeight - safeTop * 0.25);
  return {
    backingStart,
    backingEnd,
    switchTone: backingStart + (backingEnd - backingStart) * 0.68,
  };
}

export function homePhotoStatus(y: number, previous: boolean, switchTone: number) {
  return previous ? y < switchTone : y <= switchTone - 6;
}
