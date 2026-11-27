import { homePhotoStatus, homeStatusTransition } from '../src/features/home-status';

describe('Home iOS chrome around the panorama boundary', () => {
  it.each([
    [247, 47, 223],
    [315, 62, 289],
  ])(
    'keeps the photo tone on refresh and restores it when scrolling back (%s)',
    (hero, inset, fade) => {
      const { backingStart, backingEnd, switchTone } = homeStatusTransition(hero, inset, fade);
      expect(backingStart).toBeLessThan(switchTone);
      expect(backingEnd).toBeGreaterThan(switchTone);
      expect(backingEnd).toBeLessThan(hero);
      expect(homePhotoStatus(-80, true, switchTone)).toBe(true);
      expect(homePhotoStatus(backingStart, true, switchTone)).toBe(true);
      expect(homePhotoStatus(hero + 1, true, switchTone)).toBe(false);
      expect(homePhotoStatus(switchTone - 2, false, switchTone)).toBe(false);
      expect(homePhotoStatus(0, false, switchTone)).toBe(true);
    },
  );
});
