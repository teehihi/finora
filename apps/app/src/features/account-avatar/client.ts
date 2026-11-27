import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { withReadDeadline } from '@finora/api-client';
import type { AccountAvatar, AvatarMime } from '@finora/contracts';
import { auth, base } from '../../services/client';
import { awaitUploadResponse } from '../documents/upload-response';

export const avatarKey = (owner?: string) => ['account-avatar', owner] as const;
export class AvatarApiError extends Error {
  constructor(readonly status: number) {
    super('Avatar request failed');
  }
}
async function request(
  method: 'GET' | 'PUT',
  signal?: AbortSignal,
  body?: BodyInit,
  mime?: AvatarMime,
) {
  const web = Platform.OS === 'web';
  const transport = web ? fetch : expoFetch;
  const response = await transport(base + '/api/account/avatar', {
    method,
    credentials: web ? 'include' : 'omit',
    ...(web ? { cache: 'no-store' } : {}),
    headers: {
      ...(web ? {} : { cookie: auth.getCookie() }),
      ...(mime ? { 'Content-Type': mime } : {}),
    },
    body,
    signal,
  });
  if (!response.ok) throw new AvatarApiError(response.status);
  return (await response.json()) as AccountAvatar;
}
export function useAccountAvatar(owner?: string) {
  return useQuery({
    queryKey: avatarKey(owner),
    enabled: Boolean(owner),
    queryFn: ({ signal }) => withReadDeadline((readSignal) => request('GET', readSignal), signal),
    retry: false,
  });
}
export const saveAvatar = (body: BodyInit, mime: AvatarMime) =>
  awaitUploadResponse((signal) => request('PUT', signal, body, mime), 25000);
