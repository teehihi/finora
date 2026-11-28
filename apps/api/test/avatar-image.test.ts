import sharp from 'sharp';
import { normalizeAvatar } from '../src/modules/avatar-image.js';

describe('avatar processing', () => {
  it('produces square JPEG without the source metadata', async () => {
    const source = await sharp({
      create: { width: 96, height: 48, channels: 3, background: '#79ba8d' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const normalized = await normalizeAvatar(source, 'image/jpeg');
    expect(normalized).not.toBeNull();
    const info = await sharp(normalized!).metadata();
    expect(info).toMatchObject({ width: 512, height: 512, format: 'jpeg' });
    expect(info.exif).toBeUndefined();
  });

  it('rejects mislabeled, corrupted and oversized uploads', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    expect(await normalizeAvatar(png, 'image/jpeg')).toBeNull();
    expect(await normalizeAvatar(png.subarray(0, 28), 'image/png')).toBeNull();
    expect(await normalizeAvatar(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).toBeNull();
  });
});
