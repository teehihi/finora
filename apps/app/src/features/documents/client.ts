import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { getDocumentAsync } from 'expo-document-picker';
import { fetch as expoFetch } from 'expo/fetch';
import {
  documentMimeSchema,
  maxDocumentBytes,
  type DocumentMime,
  type DocumentReview,
  type DocumentReviewInput,
  type DocumentSummary,
  type Estimate,
} from '@finora/contracts';
import { auth, base } from '../../services/client';

export class DocumentApiError extends Error {
  constructor(public readonly status: number) {
    super('Document API error');
  }
}

const segments = (id: string) => '/' + encodeURIComponent(id);
async function request<T>(
  path: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: BodyInit,
) {
  const web = Platform.OS === 'web';
  const post = web ? fetch : expoFetch;
  const response = await post(base + '/api/document-analysis' + path, {
    body,
    method,
    credentials: web ? 'include' : 'omit',
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
  list: () => request<DocumentSummary[]>(''),
  get: (id: string) => request<DocumentReview>(segments(id)),
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
export async function choosePrivateDocument() {
  const picked = await getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  // Some OS file providers omit MIME; the server always validates the signature.
  const fallback = /\.pdf$/i.test(asset.name)
    ? 'application/pdf'
    : /\.png$/i.test(asset.name)
      ? 'image/png'
      : /\.jpe?g$/i.test(asset.name)
        ? 'image/jpeg'
        : '';
  const mime = documentMimeSchema.safeParse(
    asset.mimeType && asset.mimeType !== 'application/octet-stream' ? asset.mimeType : fallback,
  );
  const tooLarge = asset.size !== undefined && asset.size > maxDocumentBytes;
  if (Platform.OS === 'web') {
    if (!mime.success || tooLarge || !asset.file || asset.file.size > maxDocumentBytes)
      throw new DocumentApiError(413);
    return { body: asset.file, mime: mime.data };
  }
  const localCopy = new File(asset.uri);
  try {
    if (!mime.success || tooLarge || localCopy.size > maxDocumentBytes)
      throw new DocumentApiError(413);
    const bytes = await localCopy.bytes();
    if (bytes.byteLength > maxDocumentBytes) throw new DocumentApiError(413);
    return { body: Uint8Array.from(bytes).buffer, mime: mime.data };
  } finally {
    // DocumentPicker copied into the sandbox; leave the user's original untouched.
    try {
      localCopy.delete();
    } catch {
      // Unavailable temporary file; no data is logged.
    }
  }
}
