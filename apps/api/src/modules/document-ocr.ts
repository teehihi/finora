import type { DocumentEvidenceBox } from '@finora/contracts';
import type { DocumentPageText } from './document-fields.js';

export function parseOcrTsv(
  tsv: string,
  page: number,
  imageWidth: number,
  imageHeight: number,
): DocumentPageText {
  const groups = new Map<
    string,
    {
      words: string[];
      left: number;
      top: number;
      right: number;
      bottom: number;
    }
  >();
  for (const row of tsv.split(/\r?\n/).slice(1, 20_000)) {
    const cells = row.split('\t');
    if (cells.length < 12 || cells[0] !== '5') continue;
    const [x, y, width, height] = [cells[6], cells[7], cells[8], cells[9]].map(Number);
    const word = cells
      .slice(11)
      .join(' ')
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .trim();
    if (
      !word ||
      ![x, y, width, height].every(Number.isSafeInteger) ||
      x < 0 ||
      y < 0 ||
      width < 1 ||
      height < 1 ||
      x + width > imageWidth ||
      y + height > imageHeight
    )
      continue;
    const key = cells.slice(1, 5).join(':');
    const group = groups.get(key) ?? {
      words: [],
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
    };
    group.words.push(word);
    group.left = Math.min(group.left, x);
    group.top = Math.min(group.top, y);
    group.right = Math.max(group.right, x + width);
    group.bottom = Math.max(group.bottom, y + height);
    groups.set(key, group);
  }
  const lines: { text: string; bbox: DocumentEvidenceBox }[] = [];
  for (const group of groups.values()) {
    lines.push({
      text: group.words.join(' ').slice(0, 500),
      bbox: {
        x: group.left,
        y: group.top,
        width: group.right - group.left,
        height: group.bottom - group.top,
        imageWidth,
        imageHeight,
      },
    });
  }
  return {
    page,
    origin: 'ocr',
    text: lines.map((line) => line.text).join('\n'),
    lines,
  };
}
