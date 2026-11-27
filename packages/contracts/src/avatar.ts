export const maxAvatarBytes = 5 * 1024 * 1024;
export const avatarMimes = ['image/jpeg', 'image/png'] as const;
export type AvatarMime = (typeof avatarMimes)[number];
export function avatarMime(value: unknown): value is AvatarMime {
  return avatarMimes.some((mime) => mime === value);
}
export type AccountAvatar = { dataUrl: string | null };
