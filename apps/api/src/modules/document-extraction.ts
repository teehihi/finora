import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maxDocumentBytes, type DocumentMime, type DocumentReview } from '@finora/contracts';
import { extractDocumentFields } from './document-fields.js';
import { parseOcrTsv } from './document-ocr.js';
import { assessDocumentRisks } from './document-risk.js';

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

type Extraction = Pick<
  DocumentReview,
  'mode' | 'fields' | 'reason' | 'risks' | 'pagesAnalyzed' | 'truncated'
>;
let workers = 0;
const MAX_WORKERS = 2;
const PDF_PAGES = 20;

function localReader(
  tool: 'pdftotext' | 'pdftoppm' | 'tesseract',
  args: string[],
  bytes?: Buffer,
  timeout = 8_000,
) {
  return new Promise<string>((resolve, reject) => {
    // Fixed executable, fixed arguments except allowlisted OCR language; never use a shell or an uploaded name.
    const child = execFile(
      tool,
      args,
      {
        encoding: 'utf8',
        timeout,
        maxBuffer: 600_000,
        killSignal: 'SIGKILL',
        env: {
          PATH: process.env.PATH,
          LANG: 'C.UTF-8',
          OMP_THREAD_LIMIT: '1',
          ...(process.env.TESSDATA_PREFIX ? { TESSDATA_PREFIX: process.env.TESSDATA_PREFIX } : {}),
        },
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

function dimensions(bytes: Buffer, mime: DocumentMime): [number, number] {
  if (mime === 'image/png') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  for (let p = 2; p + 8 < bytes.length;) {
    if (bytes[p++] !== 0xff) break;
    while (bytes[p] === 0xff) p++;
    const type = bytes[p++];
    if (type === 0xda) break;
    const length = bytes.readUInt16BE(p);
    if ([0xc0, 0xc1, 0xc2].includes(type))
      return [bytes.readUInt16BE(p + 5), bytes.readUInt16BE(p + 3)];
    p += length;
  }
  throw new Error('Image dimensions unavailable');
}

async function ocrPage(bytes: Buffer, page: number, mime: DocumentMime, language: string) {
  const [width, height] = dimensions(bytes, mime);
  const tsv = await localReader(
    'tesseract',
    ['stdin', 'stdout', '-l', language, '--psm', '6', 'tsv'],
    bytes,
  );
  return parseOcrTsv(tsv, page, width, height);
}

async function renderPdfPages(bytes: Buffer, first = 1, last = PDF_PAGES): Promise<Buffer[]> {
  const dir = await mkdtemp(join(tmpdir(), 'finora-document-'));
  const input = join(dir, 'input.pdf');
  const output = join(dir, 'page');
  try {
    await writeFile(input, bytes, { flag: 'wx', mode: 0o600 });
    await localReader(
      'pdftoppm',
      [
        '-f',
        String(first),
        '-l',
        String(last),
        '-scale-to',
        '1600',
        '-gray',
        '-png',
        input,
        output,
      ],
      undefined,
      20_000,
    );
    const names = (await readdir(dir))
      .filter((name) => /^page-\d+\.png$/.test(name))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
      .slice(0, PDF_PAGES);
    const pages: Buffer[] = [];
    for (const name of names) {
      const image = await readFile(join(dir, name));
      if (image.length > 8 * 1024 * 1024 || !pngOk(image))
        throw new Error('Invalid rendered PDF page');
      pages.push(image);
    }
    return pages;
  } finally {
    for (const name of await readdir(dir)) {
      if (name === 'input.pdf' || /^page-\d+\.png$/.test(name)) await unlink(join(dir, name));
    }
    await rmdir(dir);
  }
}

export async function renderPrivatePdfPage(bytes: Buffer, page: number): Promise<Buffer> {
  if (!Number.isInteger(page) || page < 1 || page > PDF_PAGES)
    throw new RangeError('Invalid PDF page');
  const images = await renderPdfPages(bytes, page, page);
  if (images.length !== 1) throw new Error('PDF page unavailable');
  return images[0];
}

function failureReason(error: unknown): Extraction['reason'] {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === 'ENOENT') return 'reader-unavailable';
  if (code === 'ETIMEDOUT') return 'processing-timeout';
  return 'text-unavailable';
}

export class DocumentReadersBusy extends Error {}
export async function analyzeDocument(bytes: Buffer, mime: DocumentMime): Promise<Extraction> {
  const manual = (reason: Extraction['reason']): Extraction => ({
    mode: 'manual',
    reason,
    fields: extractDocumentFields([]),
    pagesAnalyzed: 0,
    risks: assessDocumentRisks(extractDocumentFields([])),
  });
  const ocrLang = process.env.DOCUMENT_OCR_LANGS;
  const useOcr =
    ocrLang === 'eng' || ocrLang === 'vie' || ocrLang === 'vie+eng' || ocrLang === 'eng+vie';
  if (mime !== 'application/pdf' && !useOcr) return manual('ocr-unavailable');
  if (workers >= MAX_WORKERS) throw new DocumentReadersBusy();
  workers++;
  try {
    if (mime === 'application/pdf') {
      let pages: {
        page: number;
        text: string;
        origin: 'pdf-text' | 'ocr';
        lines?: ReturnType<typeof parseOcrTsv>['lines'];
      }[] = [];
      let partialReason: Extraction['reason'];
      try {
        const raw = await localReader(
          'pdftotext',
          ['-f', '1', '-l', String(PDF_PAGES), '-layout', '-enc', 'UTF-8', '-', '-'],
          bytes,
        );
        const parts = raw.split('\f');
        if (raw.endsWith('\f')) parts.pop();
        pages = parts
          .slice(0, PDF_PAGES)
          .map((text, index) => ({ page: index + 1, text, origin: 'pdf-text' as const }));
      } catch (error) {
        if (!useOcr) return manual(failureReason(error));
      }
      const needsOcr = !pages.length || pages.some(({ text }) => text.trim().length < 20);
      if (needsOcr && useOcr) {
        try {
          const images = await renderPdfPages(bytes);
          const deadline = Date.now() + 40_000;
          for (let i = 0; i < images.length; i++) {
            if (pages[i]?.text.trim().length >= 20) continue;
            if (Date.now() > deadline)
              throw Object.assign(new Error('OCR time budget'), { code: 'ETIMEDOUT' });
            const ocr = await ocrPage(images[i], i + 1, 'image/png', ocrLang);
            pages[i] = { ...ocr, origin: 'ocr' };
          }
        } catch (error) {
          partialReason = failureReason(error);
        }
      } else if (needsOcr) partialReason = 'ocr-unavailable';
      if (!pages.some(({ text }) => text.trim().length))
        return manual(partialReason ?? (useOcr ? 'text-unavailable' : 'ocr-unavailable'));
      const fields = extractDocumentFields(pages);
      return {
        mode: pages.some((page) => page.origin === 'ocr') ? 'pdf-ocr' : 'pdf-text',
        fields,
        risks: assessDocumentRisks(fields),
        reason: partialReason,
        pagesAnalyzed: pages.length,
        truncated: pages.length >= PDF_PAGES,
      };
    }
    if (!useOcr) return manual('ocr-unavailable');
    const page = await ocrPage(bytes, 1, mime, ocrLang);
    if (!page.text.trim()) return manual('text-unavailable');
    const fields = extractDocumentFields([page]);
    return { mode: 'local-ocr', fields, risks: assessDocumentRisks(fields), pagesAnalyzed: 1 };
  } catch (error) {
    return manual(failureReason(error));
  } finally {
    workers--;
  }
}
