import {
  documentFieldNames,
  loanSchema,
  type DocumentField,
  type DocumentFieldName,
} from '@finora/contracts';

const labels: Record<DocumentFieldName, readonly string[]> = {
  lender: ['lender', 'loan provider', 'ben cho vay', 'to chuc cho vay', 'ngan hang cho vay'],
  principal: ['principal', 'loan principal', 'loan amount', 'so tien vay', 'tien goc', 'goc vay'],
  months: [
    'loan duration',
    'loan term',
    'duration',
    'term',
    'thoi han vay',
    'ky han vay',
    'ky han',
  ],
  annualRate: [
    'annual interest rate',
    'annual rate',
    'nominal annual rate',
    'lai suat nam',
    'lai suat danh nghia',
    'lai suat',
  ],
  method: [
    'interest calculation method',
    'repayment method',
    'method',
    'phuong phap tinh lai',
    'phuong thuc tra no',
    'cach tinh lai',
  ],
  firstDue: [
    'first due date',
    'first payment date',
    'ngay tra ky dau',
    'ngay tra no dau tien',
    'ngay den han ky dau',
  ],
  monthlyRepayment: [
    'monthly repayment',
    'monthly payment',
    'khoan tra hang thang',
    'tien tra hang thang',
    'tra no hang thang',
  ],
  totalRepayment: [
    'total repayment',
    'total amount payable',
    'tong tra no',
    'tong so tien phai tra',
    'tong tien phai tra',
  ],
  totalFees: ['total fees', 'total upfront fees', 'tong phi', 'tong muc phi', 'tong cac khoan phi'],
  serviceFee: ['service fee', 'processing fee', 'phi dich vu', 'phi xu ly'],
  insuranceFee: ['insurance fee', 'insurance premium', 'phi bao hiem'],
  latePenalty: [
    'late payment penalty',
    'late payment fee',
    'phat cham tra',
    'phi cham tra',
    'phat tra cham',
  ],
  earlyRepayment: [
    'early repayment',
    'early settlement',
    'early repayment conditions',
    'tra no truoc han',
    'tat toan truoc han',
    'dieu kien tra truoc han',
  ],
  importantClauses: [
    'important clauses',
    'special conditions',
    'dieu khoan quan trong',
    'dieu kien dac biet',
    'dieu khoan dac biet',
  ],
};
const fieldByLabel = new Map(
  documentFieldNames.flatMap((name) => labels[name].map((label) => [label, name] as const)),
);
const moneyFields = new Set<DocumentFieldName>([
  'principal',
  'monthlyRepayment',
  'totalRepayment',
  'totalFees',
  'serviceFee',
  'insuranceFee',
]);
const clean = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const fold = (s: string) =>
  clean(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');

function money(value: string) {
  const m = clean(value).match(
    /^(\d{1,13}|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+)\s*(?:₫|đ|VNĐ|VND)$/iu,
  );
  if (!m) return null;
  const n = Number(m[1].replace(/[., ]/g, ''));
  return Number.isSafeInteger(n) && n <= 1_000_000_000_000 ? n : null;
}

function parse(field: DocumentFieldName, value: string, label: string): string | number | null {
  if (moneyFields.has(field)) {
    const n = money(value);
    return field === 'principal' && n === 0 ? null : n;
  }
  const v = fold(value);
  if (!v) return null;
  if (field === 'months') {
    const m = v.match(/^(\d{1,3})\s*(?:thang|months?)$/);
    const n = m ? Number(m[1]) : 0;
    return n > 0 && n <= 360 ? n : null;
  }
  if (field === 'annualRate') {
    if (
      !/(^|\s)(annual|nam)(\s|$)/.test(label) &&
      !/(?:\/\s*nam|moi nam|per annum|per year|p\.a\.)$/.test(v)
    )
      return null;
    const m = v.match(
      /^(\d{1,3}(?:[.,]\d{1,4})?)\s*%\s*(?:\/\s*nam|moi nam|per annum|per year|p\.a\.)?$/,
    );
    const n = m ? Number(m[1].replace(',', '.')) : -1;
    return n >= 0 && n <= 100 ? n : null;
  }
  if (field === 'method') {
    if (/^(flat|flat rate|lai phang|lai tren du no goc|du no goc)$/.test(v)) return 'flat';
    if (/^(equal principal|goc chia deu|tra goc deu)$/.test(v)) return 'equalPrincipal';
    if (/^(annuity|equal installments|tra gop deu|tra deu hang thang)$/.test(v)) return 'annuity';
    return null;
  }
  if (field === 'firstDue') {
    const localDate = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    const iso = localDate
      ? `${localDate[3]}-${localDate[2].padStart(2, '0')}-${localDate[1].padStart(2, '0')}`
      : v;
    return loanSchema.shape.firstDue.safeParse(iso).success ? iso : null;
  }
  return clean(value).slice(0, field === 'lender' ? 160 : 220);
}

export function extractDocumentFields(
  pages: { page: number; text: string }[],
): Record<DocumentFieldName, DocumentField> {
  const entries = {} as Record<DocumentFieldName, DocumentField>;
  for (const key of documentFieldNames)
    entries[key] = { state: 'missing', value: null, sources: [] };
  for (const { page, text } of pages) {
    for (const raw of text.split(/\r?\n/).slice(0, 1_200)) {
      const line = clean(raw);
      const delimiter = line.indexOf(':');
      if (delimiter < 1 || delimiter > 70) continue;
      const label = fold(line.slice(0, delimiter));
      const field = fieldByLabel.get(label);
      if (!field) continue;
      const source = { page, excerpt: line.slice(0, 240) };
      const value = parse(field, line.slice(delimiter + 1), label);
      const old = entries[field];
      if (old.sources.length < 3) old.sources.push(source);
      if (old.state === 'conflicting') continue;
      if (value === null) {
        if (old.state === 'found') {
          old.state = 'conflicting';
          old.value = null;
        } else {
          old.state = 'unsupported';
        }
      } else if (old.state === 'missing') {
        old.state = 'found';
        old.value = value;
      } else if (old.state !== 'found' || old.value !== value) {
        old.state = 'conflicting';
        old.value = null;
      }
    }
  }
  return entries;
}
