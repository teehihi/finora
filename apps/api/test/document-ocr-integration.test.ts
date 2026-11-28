import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeDocument, isValidDocument } from '../src/modules/document-extraction';
import { syntheticLoanOfferPdf } from '../../app/src/features/documents/fixture';

const ready =
  ['tesseract', 'pdftoppm', 'pdftotext'].every(
    (tool) => !spawnSync(tool, ['-v'], { encoding: 'utf8', timeout: 3_000 }).error,
  ) && !!process.env.DOCUMENT_OCR_LANGS;
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name));

(ready ? describe : describe.skip)('local OCR and PDF readers on synthetic documents', () => {
  it('recognizes Vietnamese terms in a scanned PNG with page and box evidence', async () => {
    const image = fixture('vi-scan.png');
    expect(isValidDocument(image, 'image/png')).toBe(true);
    const result = await analyzeDocument(image, 'image/png');
    expect(result.mode).toBe('local-ocr');
    expect(result.fields.principal.value).toBe(30_000_000);
    expect(result.fields.months.value).toBe(24);
    expect(result.fields.annualRate.value).toBe(12.5);
    expect(result.fields.principal.sources[0]).toMatchObject({
      page: 1,
      bbox: { imageWidth: 1600, imageHeight: 1100 },
    });
    expect(result.fields.principal.confidence).toBe('review');
  });

  it('uses native text before OCR and OCR on both scanned PDF pages', async () => {
    const native = await analyzeDocument(Buffer.from(syntheticLoanOfferPdf()), 'application/pdf');
    expect(native.mode).toBe('pdf-text');
    expect(native.fields.principal.value).toBe(30_000_000);
    expect(native.fields.principal.extraction).toBe('direct_text');

    const scanned = fixture('vi-scan.pdf');
    expect(isValidDocument(scanned, 'application/pdf')).toBe(true);
    const result = await analyzeDocument(scanned, 'application/pdf');
    expect(result.mode).toBe('pdf-ocr');
    expect(result.pagesAnalyzed).toBe(2);
    expect(result.fields.principal.value).toBe(30_000_000);
    expect(result.fields.serviceFee.value).toBe(120_000);
    expect(result.fields.serviceFee.sources[0].page).toBe(2);
  }, 50_000);
});
