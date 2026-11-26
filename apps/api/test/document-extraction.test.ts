import { maxDocumentBytes } from '@finora/contracts';
import { analyzeDocument, isValidDocument } from '../src/modules/document-extraction';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ2QAAAAASUVORK5CYII=',
  'base64',
);

test('document boundary rejects empty, oversized, and mismatched files', () => {
  expect(isValidDocument(png, 'image/png')).toBe(true);
  expect(isValidDocument(png, 'image/jpeg')).toBe(false);
  expect(isValidDocument(png, 'application/pdf')).toBe(false);
  expect(isValidDocument(Buffer.alloc(0), 'application/pdf')).toBe(false);
  expect(isValidDocument(Buffer.alloc(maxDocumentBytes + 1), 'application/pdf')).toBe(false);
  expect(isValidDocument(Buffer.from('%PDF-1.4\nno end-of-file'), 'application/pdf')).toBe(false);
});

test('unreadable PDF degrades to manual review without inventing extracted terms', async () => {
  const unreadable = Buffer.from('%PDF-1.4\n%%EOF\n');
  expect(isValidDocument(unreadable, 'application/pdf')).toBe(true);
  const result = await analyzeDocument(unreadable, 'application/pdf');
  expect(result.mode).toBe('manual');
  expect(['text-unavailable', 'reader-unavailable']).toContain(result.reason);
  expect(
    Object.values(result.fields).every(({ state, value }) => state === 'missing' && value === null),
  ).toBe(true);
});
