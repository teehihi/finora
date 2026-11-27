import { maxAvatarBytes, type AvatarMime } from '@finora/contracts';
import sharp from 'sharp';

let active = 0;
export class AvatarImageBusy extends Error {}

export async function normalizeAvatar(input: Buffer, mime: AvatarMime): Promise<Buffer | null> {
  if (!input.length || input.length > maxAvatarBytes) return null;
  // Do not pass unknown, vector or container formats to the image decoder.
  const matches =
    mime === 'image/png'
      ? input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : input.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!matches) return null;
  if (active >= 3) throw new AvatarImageBusy();
  active++;
  try {
    const photo = sharp(input, { limitInputPixels: 24_000_000, failOn: 'warning' });
    const info = await photo.metadata();
    if (info.format !== (mime === 'image/png' ? 'png' : 'jpeg') || (info.pages ?? 1) !== 1)
      return null;
    // No withMetadata(): discard EXIF (including GPS), XMP and original bytes.
    return await photo
      .autoOrient()
      .resize(512, 512, { fit: 'cover' })
      .flatten({ background: '#f3f7ef' })
      .jpeg({ quality: 83, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  } finally {
    active--;
  }
}
