import { dark, light } from '@finora/design-tokens';

function luminance(hex: string) {
  const parts = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = parts.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string) {
  const a = luminance(fg) + 0.05;
  const b = luminance(bg) + 0.05;
  return Math.max(a, b) / Math.min(a, b);
}

for (const [theme, t] of Object.entries({ light, dark })) {
  test(theme + ' signature colors meet 4.5:1 on headline, text and action role pairs', () => {
    for (const [fg, bg] of [
      [t.foreground, t.background],
      [t.muted, t.surface],
      [t.primary, t.surface],
      [t.onPrimary, t.primary],
      [t.signatureInk, t.signatureLime],
      [t.onForest, t.signatureEnd],
      [t.onForestMuted, t.signatureEnd],
      [t.actionBlue, t.actionBlueSurface],
      [t.actionAmber, t.actionAmberSurface],
      [t.actionViolet, t.actionVioletSurface],
    ]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
}
