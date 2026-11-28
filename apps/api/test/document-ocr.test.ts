import { parseOcrTsv } from '../src/modules/document-ocr';

describe('local OCR provenance', () => {
  it('groups recognized words into source lines and bounding boxes', () => {
    const tsv = [
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
      '5\t1\t1\t1\t1\t1\t10\t20\t35\t18\t84\tSố',
      '5\t1\t1\t1\t1\t2\t48\t20\t44\t18\t80\ttiền',
      '5\t1\t1\t1\t1\t3\t95\t20\t188\t18\t80\tvay:',
      '5\t1\t1\t1\t1\t4\t290\t20\t120\t18\t80\t30.000.000',
      '5\t1\t1\t1\t1\t5\t415\t20\t18\t18\t80\tđ',
    ].join('\n');
    const page = parseOcrTsv(tsv, 2, 1000, 1400);
    expect(page).toMatchObject({
      page: 2,
      origin: 'ocr',
      text: 'Số tiền vay: 30.000.000 đ',
      lines: [
        {
          text: 'Số tiền vay: 30.000.000 đ',
          bbox: { x: 10, y: 20, width: 423, height: 18, imageWidth: 1000, imageHeight: 1400 },
        },
      ],
    });
  });

  it('ignores malformed coordinates and TSV controls', () => {
    const tsv =
      'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n' +
      '5\t1\t1\t1\t1\t1\t-1\t5\t4\t8\t90\tbad\n' +
      '5\t1\t1\t1\t1\t2\t10\t5\t10\t8\t90\tPrincipal:\n' +
      '5\t1\t1\t1\t1\t3\t23\t5\t10\t8\t90\t0\n';
    expect(parseOcrTsv(tsv, 1, 100, 100).text).toBe('Principal: 0');
  });
});
