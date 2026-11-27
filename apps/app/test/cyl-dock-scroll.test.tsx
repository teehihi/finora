import { describe, expect, it } from '@jest/globals';
import { initialCYLScroll, nextCYLScroll } from '../src/components/cyl-dock-scroll';

const sample = (y: number, dragging = true, bottom = 400, top = 0) => ({
  y,
  top,
  bottom,
  dragging,
});

describe('CYL dock scroll thresholds', () => {
  it('compacts while swiping up the content and expands on a deliberate reversal', () => {
    const start = nextCYLScroll(initialCYLScroll, sample(30));
    expect(start.compact).toBe(false);
    const compact = nextCYLScroll(start, sample(42));
    expect(compact.compact).toBe(true);
    const nudge = nextCYLScroll(compact, sample(37));
    expect(nudge.compact).toBe(true);
    expect(nextCYLScroll(nudge, sample(30)).compact).toBe(false);
  });

  it('does not compact with inertia, bounce or insufficient content', () => {
    expect(nextCYLScroll(initialCYLScroll, sample(140, false)).compact).toBe(false);
    expect(nextCYLScroll(initialCYLScroll, sample(-60)).compact).toBe(false);
    expect(nextCYLScroll(initialCYLScroll, sample(60, true, 70)).compact).toBe(false);
  });

  it('ignores bottom rubber band and restores on scroll-to-top even without a drag', () => {
    const compact = nextCYLScroll(initialCYLScroll, sample(410, true, 400, -20));
    const bounce = nextCYLScroll(compact, sample(450, true, 400, -20));
    expect(bounce.compact).toBe(true);
    expect(nextCYLScroll(bounce, sample(-20, false, 400, -20)).compact).toBe(false);
  });
});
