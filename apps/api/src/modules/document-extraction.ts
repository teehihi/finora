import { execFile } from 'node:child_process';
import { maxDocumentBytes, type DocumentMime, type DocumentReview } from '@finora/contracts';
import { extractDocumentFields } from './document-fields.js';

function dimensionsOk(width: number, height: number) {
  return (
    width > 0 && height > 0 && width <= 8_000 && height <= 8_000 && width * height <= 20_000_000
  );
}

function pngOk(bytes: Buffer) {
  if (
    bytes.length < 45 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return false;
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') return false;
  if (!dimensionsOk(bytes.readUInt32BE(16), bytes.readUInt32BE(20))) return false;
  let hasImageData = false;
  for (let start = 8, chunks = 0; start + 12 <= bytes.length && chunks < 2_000; chunks++) {
    const len = bytes.readUInt32BE(start);
    const kind = bytes.toString('ascii', start + 4, start + 8);
    start += len + 12;
    if (start > bytes.length) return false;
    if (kind === 'IDAT' && len > 0) hasImageData = true;
    if (kind === 'IEND') return len === 0 && start === bytes.length && hasImageData;
  }
  return false;
}

function jpegOk(bytes: Buffer) {
  if (
    bytes.length < 18 ||
    bytes.readUInt16BE(0) !== 0xffd8 ||
    bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
  )
    return false;
  let hasDimensions = false;
  for (let p = 2; p + 3 < bytes.length;) {
    if (bytes[p++] !== 0xff) return false;
    while (p < bytes.length && bytes[p] === 0xff) p++;
    const type = bytes[p++];
    if (type === 0xda) return hasDimensions && p + 3 < bytes.length;
    if (type >= 0xd0 && type <= 0xd9) return false;
    if (p + 2 > bytes.length) return false;
    const len = bytes.readUInt16BE(p);
    if (len < 2 || p + len > bytes.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(type)) {
      if (len < 8 || !dimensionsOk(bytes.readUInt16BE(p + 5), bytes.readUInt16BE(p + 3)))
        return false;
      hasDimensions = true;
    }
    p += len;
  }
  return false;
}

export function isValidDocument(bytes: Buffer, mime: DocumentMime) {
  if (bytes.length === 0 || bytes.length > maxDocumentBytes) return false;
  if (mime === 'application/pdf')
    return (
      /^%PDF-[12]\.\d[\r\n]/.test(bytes.toString('latin1', 0, 16)) &&
      /%%EOF\s*$/.test(bytes.subarray(-1024).toString('latin1'))
    );
  return mime === 'image/png' ? pngOk(bytes) : jpegOk(bytes);
}

type Extraction = Pick<DocumentReview, 'mode' | 'fields' | 'reason'>;
let workers = 0;
const MAX_WORKERS = 2;
const PDF_PAGES = 20;

function localReader(tool: 'pdftotext' | 'tesseract', args: string[], bytes: Buffer) {
  return new Promise<string>((resolve, reject) => {
    // Fixed executable, fixed arguments except allowlisted OCR language; never use a shell or an uploaded name.
    const child = execFile(
      tool,
      args,
      {
        encoding: 'utf8',
        timeout: 8_000,
        maxBuffer: 600_000,
        killSignal: 'SIGKILL',
        env: { PATH: process.env.PATH, LANG: 'C.UTF-8', OMP_THREAD_LIMIT: '1' },
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      },
    );
    child.stdin?.on('error', () => {});
    child.stdin?.end(bytes);
  });
}

export class DocumentReadersBusy extends Error {}
export async function analyzeDocument(bytes: Buffer, mime: DocumentMime): Promise<Extraction> {
  const manual = (reason: Extraction['reason']): Extraction => ({
    mode: 'manual',
    reason,
    fields: extractDocumentFields([]),
  });
  const ocrLang = process.env.DOCUMENT_OCR_LANGS;
  const useOcr =
    ocrLang === 'eng' || ocrLang === 'vie' || ocrLang === 'vie+eng' || ocrLang === 'eng+vie';
  if (mime !== 'application/pdf' && !useOcr) return manual('ocr-unavailable');
  if (workers >= MAX_WORKERS) throw new DocumentReadersBusy();
  workers++;
  try {
    if (mime === 'application/pdf') {
      const raw = await localReader(
        'pdftotext',
        ['-f', '1', '-l', String(PDF_PAGES), '-layout', '-enc', 'UTF-8', '-', '-'],
        bytes,
      );
      const pages = raw
        .split('\f')
        .slice(0, PDF_PAGES)
        .map((value, index) => ({ page: index + 1, text: value }));
      if (!pages.some(({ text }) => text.trim().length)) return manual('text-unavailable');
      return { mode: 'pdf-text', fields: extractDocumentFields(pages) };
    }
    if (!useOcr) return manual('ocr-unavailable');
    const text = await localReader(
      'tesseract',
      ['stdin', 'stdout', '-l', ocrLang, '--psm', '6'],
      bytes,
    );
    if (!text.trim()) return manual('text-unavailable');
    return { mode: 'local-ocr', fields: extractDocumentFields([{ page: 1, text }]) };
  } catch (error) {
    return manual(
      (error as NodeJS.ErrnoException).code === 'ENOENT'
        ? 'reader-unavailable'
        : 'text-unavailable',
    );
  } finally {
    workers--;
  }
}
