// The dock replaces peers; pushed drill-downs keep the system transition and
// its interactive pop. Don't force an iOS animation onto Android back.
const peers = new Set(['home', 'explore', 'assistant', 'loans', 'profile']);

export function workspaceMotion(
  route: string,
  reduced: boolean,
  platform: string,
  finSwipeReturn = false,
) {
  if (platform === 'web' || reduced) return { animation: 'none' } as const;
  if (finSwipeReturn) return { animation: 'default', animationTypeForReplace: 'pop' } as const;
  if (peers.has(route)) {
    return { animation: 'fade', animationDuration: 220, animationTypeForReplace: 'push' } as const;
  }
  return { animation: 'default' } as const;
}
