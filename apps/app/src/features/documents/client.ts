import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { getDocumentAsync } from 'expo-document-picker';
import { fetch as expoFetch } from 'expo/fetch';
import {
  maxDocumentBytes,
  type DocumentMime,
  type DocumentReview,
  type DocumentReviewInput,
  type DocumentSummary,
  type Estimate,
} from '@finora/contracts';
import { auth, base } from '../../services/client';
import { DocumentApiError, documentFileMime } from './file-policy';

export { DocumentApiError, documentFileMime } from './file-policy';

const segments = (id: string) => '/' + encodeURIComponent(id);
async function request<T>(
  path: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: BodyInit,
  signal?: AbortSignal,
) {
  const web = Platform.OS === 'web';
  const post = web ? fetch : expoFetch;
  const response = await post(base + '/api/document-analysis' + path, {
    body,
    signal,
    method,
    credentials: web ? 'include' : 'omit',
    ...(web ? { cache: 'no-store' as const } : {}),
    headers: web ? headers : { ...headers, cookie: auth.getCookie() },
  });
  if (!response.ok) throw new DocumentApiError(response.status);
  return (await response.json()) as T;
}
function json<T>(
  path: string,
  body: DocumentReviewInput | (DocumentReviewInput & { requestId: string }),
) {
  return request<T>(path, 'POST', { 'Content-Type': 'application/json' }, JSON.stringify(body));
}
export const docApi = {
  list: (signal?: AbortSignal) => request<DocumentSummary[]>('', 'GET', {}, undefined, signal),
  get: (id: string, signal?: AbortSignal) =>
    request<DocumentReview>(segments(id), 'GET', {}, undefined, signal),
  remove: (id: string) => request<{ deleted: true }>(segments(id), 'DELETE'),
  upload: (body: BodyInit, mime: DocumentMime, synthetic = false) =>
    request<DocumentReview>(
      '',
      'POST',
      {
        'Content-Type': mime,
        ...(synthetic ? { 'x-finora-synthetic': '1' } : {}),
      },
      body,
    ),
  preview: (id: string, body: DocumentReviewInput) =>
    json<Estimate>(segments(id) + '/preview', body),
  save: (id: string, body: DocumentReviewInput, requestId: string) =>
    json<{ id: string }>(segments(id) + '/save', { ...body, requestId }),
};
export const privateDocumentFileUrl = (id: string) =>
  base + '/api/document-analysis' + segments(id) + '/file';

// Fetch only after the owner opens the preview. The bytes stay in memory, are never
// added to the query cache, and the account-scoped server route authorizes each fetch.
export async function loadPrivateImage(
  id: string,
  mime: 'image/jpeg' | 'image/png',
  signal: AbortSignal,
) {
  const web = Platform.OS === 'web';
  const get = web ? fetch : expoFetch;
  const response = await get(privateDocumentFileUrl(id), {
    signal,
    method: 'GET',
    credentials: web ? 'include' : 'omit',
    headers: web ? {} : { cookie: auth.getCookie() },
    ...(web ? { cache: 'no-store' as const } : {}),
  });
  if (!response.ok) throw new DocumentApiError(response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxDocumentBytes) throw new DocumentApiError(413);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let part = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    part +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
      (i + 2 < bytes.length ? alphabet[c & 63] : '=');
    if (part.length >= 8192) {
      chunks.push(part);
      part = '';
    }
  }
  chunks.push(part);
  return 'data:' + mime + ';base64,' + chunks.join('');
}

export type PickedPrivateDocument = { body: BodyInit; mime: DocumentMime };

export async function choosePrivateDocument(): Promise<PickedPrivateDocument | null> {
  const picked = await getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  const localCopy = new File(asset.uri);
  try {
    const mime = documentFileMime(asset.name, asset.mimeType, asset.size);
    if (localCopy.size > maxDocumentBytes) throw new DocumentApiError(413);
    const bytes = await localCopy.bytes();
    if (!bytes.byteLength) throw new DocumentApiError(400);
    if (bytes.byteLength > maxDocumentBytes) throw new DocumentApiError(413);
    return { body: Uint8Array.from(bytes).buffer, mime };
  } finally {
    // DocumentPicker copied into the sandbox; leave the user's original untouched.
    try {
      localCopy.delete();
    } catch {
      // An unavailable temporary file does not need to be logged.
    }
  }
}
