import { documentMimeSchema, maxDocumentBytes, type DocumentMime } from '@finora/contracts';

export class DocumentApiError extends Error {
  constructor(public readonly status: number) {
    super('Document API error');
  }
}

export function documentFileMime(name: string, mimeType?: string, size?: number): DocumentMime {
  // Some file providers omit MIME; the server verifies the content separately.
  const fallback = /\.pdf$/i.test(name)
    ? 'application/pdf'
    : /\.png$/i.test(name)
      ? 'image/png'
      : /\.jpe?g$/i.test(name)
        ? 'image/jpeg'
        : '';
  const declared = mimeType?.trim().toLowerCase();
  const mime = documentMimeSchema.safeParse(
    declared && declared !== 'application/octet-stream' ? declared : fallback,
  );
  if (!mime.success) throw new DocumentApiError(415);
  if (size !== undefined && size > maxDocumentBytes) throw new DocumentApiError(413);
  if (size === 0) throw new DocumentApiError(400);
  return mime.data;
}
