import {
  documentFieldNames,
  loanSchema,
  type DocumentEvidenceBox,
  type DocumentField,
  type DocumentFieldName,
  type DocumentConfirmedTerm,
} from '@finora/contracts';

export type DocumentPageText = {
  page: number;
  text: string;
  origin?: 'pdf-text' | 'ocr';
  lines?: { text: string; bbox?: DocumentEvidenceBox }[];
};

const labels: Record<DocumentFieldName, readonly string[]> = {
  lender: ['lender', 'loan provider', 'ben cho vay', 'to chuc cho vay', 'ngan hang cho vay'],
  principal: ['principal', 'loan principal', 'loan amount', 'so tien vay', 'tien goc', 'goc vay'],
  disbursementAmount: [
    'disbursement amount',
    'net disbursement',
    'so tien giai ngan',
    'tien thuc nhan',
  ],
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
    'interest rate',
    'lai suat nam',
    'lai suat danh nghia',
    'lai suat',
  ],
  effectiveApr: [
    'apr',
    'effective annual rate',
    'annual percentage rate',
    'lai suat hieu dung',
    'lai suat thuc te',
  ],
  interestRateType: ['interest rate type', 'rate type', 'loai lai suat', 'hinh thuc lai suat'],
  method: [
    'interest calculation method',
    'repayment method',
    'method',
    'phuong phap tinh lai',
    'phuong thuc tra no',
    'cach tinh lai',
  ],
  paymentFrequency: [
    'payment frequency',
    'repayment frequency',
    'tan suat tra no',
    'chu ky tra no',
    'ky tra no',
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
  earlyRepaymentFee: [
    'early repayment fee',
    'early settlement fee',
    'phi tra no truoc han',
    'phi tat toan truoc han',
  ],
  otherObligations: [
    'other obligations',
    'additional obligations',
    'nghia vu khac',
    'khoan phai tra khac',
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
  documentFieldNames.flatMap((field) => labels[field].map((label) => [label, field] as const)),
);
const moneyFields = new Set<DocumentFieldName>([
  'principal',
  'disbursementAmount',
  'monthlyRepayment',
  'totalRepayment',
  'totalFees',
  'serviceFee',
  'insuranceFee',
]);
const textFields = new Set<DocumentFieldName>([
  'lender',
  'latePenalty',
  'earlyRepayment',
  'otherObligations',
  'importantClauses',
]);
const clean = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const fold = (s: string) =>
  clean(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');

function money(value: string): number | null {
  const match = clean(value).match(
    /^(\d{1,13}|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+)\s*(?:₫|đ|VNĐ|VND)$/iu,
  );
  if (!match) return null;
  const amount = Number(match[1].replace(/[., ]/g, ''));
  return Number.isSafeInteger(amount) && amount <= 1_000_000_000_000 ? amount : null;
}

type Parsed = { value: string | number; unit: NonNullable<DocumentField['unit']> };
function parse(field: DocumentFieldName, raw: string, label: string): Parsed | null {
  if (moneyFields.has(field)) {
    const value = money(raw);
    return value === null || (field === 'principal' && value === 0) ? null : { value, unit: 'VND' };
  }
  const value = fold(raw);
  if (!value) return null;
  if (field === 'months') {
    const match = value.match(/^(\d{1,3})\s*(?:thang|months?)$/);
    const months = match ? Number(match[1]) : 0;
    return months > 0 && months <= 360 ? { value: months, unit: 'months' } : null;
  }
  if (field === 'annualRate' || field === 'effectiveApr') {
    if (
      field === 'annualRate' &&
      !/(^|\s)(annual|nam)(\s|$)/.test(label) &&
      !/(?:\/\s*nam|moi nam|per annum|per year|p\.a\.)$/.test(value)
    )
      return null;
    const match = value.match(
      /^(\d{1,3}(?:[.,]\d{1,4})?)\s*%\s*(?:\/\s*nam|moi nam|per annum|per year|p\.a\.)?$/,
    );
    const rate = match ? Number(match[1].replace(',', '.')) : -1;
    return rate >= 0 && rate <= 100 ? { value: rate, unit: 'percent_per_year' } : null;
  }
  if (field === 'earlyRepaymentFee') {
    const amount = money(raw);
    if (amount !== null) return { value: amount, unit: 'VND' };
    const match = value.match(/^(\d{1,3}(?:[.,]\d{1,4})?)\s*%$/);
    const rate = match ? Number(match[1].replace(',', '.')) : -1;
    return rate >= 0 && rate <= 100 ? { value: rate, unit: 'percent' } : null;
  }
  if (field === 'interestRateType') {
    if (/^(fixed|co dinh|lai suat co dinh)$/.test(value)) return { value: 'fixed', unit: 'text' };
    if (/^(variable|floating|tha noi|bien doi|lai suat tha noi)$/.test(value))
      return { value: 'variable', unit: 'text' };
    if (/^(introductory|uu dai|lai suat uu dai)$/.test(value))
      return { value: 'introductory', unit: 'text' };
    return null;
  }
  if (field === 'method') {
    if (/^(flat|flat rate|lai phang|lai tren du no goc|du no goc)$/.test(value))
      return { value: 'flat', unit: 'text' };
    if (/^(equal principal|goc chia deu|tra goc deu)$/.test(value))
      return { value: 'equalPrincipal', unit: 'text' };
    if (/^(annuity|equal installments|tra gop deu|tra deu hang thang)$/.test(value))
      return { value: 'annuity', unit: 'text' };
    return null;
  }
  if (field === 'paymentFrequency') {
    if (/^(monthly|hang thang|moi thang)$/.test(value))
      return { value: 'monthly', unit: 'frequency' };
    if (/^(weekly|hang tuan|moi tuan)$/.test(value)) return { value: 'weekly', unit: 'frequency' };
    if (/^(quarterly|hang quy|moi quy)$/.test(value))
      return { value: 'quarterly', unit: 'frequency' };
    return null;
  }
  if (field === 'firstDue') {
    const local = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    const iso = local
      ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`
      : value;
    return loanSchema.shape.firstDue.safeParse(iso).success ? { value: iso, unit: 'date' } : null;
  }
  if (textFields.has(field))
    return { value: clean(raw).slice(0, field === 'lender' ? 160 : 220), unit: 'text' };
  return null;
}

export function normalizeConfirmedTerm(
  field: DocumentFieldName,
  rawValue: string,
): DocumentConfirmedTerm | null {
  const raw = clean(rawValue);
  if (!raw || raw.length > 220) return null;
  const parsed = parse(field, raw, field === 'annualRate' ? 'annual' : '');
  return parsed ? { ...parsed, rawValue: raw } : null;
}

function empty(): DocumentField {
  return {
    state: 'missing',
    value: null,
    sources: [],
    rawValue: null,
    unit: null,
    confidence: 'none',
    extraction: 'none',
    confirmationRequired: true,
  };
}

export function extractDocumentFields(
  pages: DocumentPageText[],
): Record<DocumentFieldName, DocumentField> {
  const entries = {} as Record<DocumentFieldName, DocumentField>;
  for (const key of documentFieldNames) entries[key] = empty();
  for (const page of pages) {
    if (!Number.isInteger(page.page) || page.page < 1) continue;
    const lines: { text: string; bbox?: DocumentEvidenceBox }[] =
      page.lines ?? page.text.split(/\r?\n/).map((text) => ({ text }));
    for (const rawLine of lines.slice(0, 1_200)) {
      const line = clean(rawLine.text);
      const delimiter = line.indexOf(':');
      if (delimiter < 1 || delimiter > 70) continue;
      const label = fold(line.slice(0, delimiter));
      const field = fieldByLabel.get(label);
      if (!field) continue;
      const source = {
        page: page.page,
        excerpt: line.slice(0, 240),
        ...(rawLine.bbox ? { bbox: rawLine.bbox } : {}),
      };
      const rawValue = clean(line.slice(delimiter + 1));
      const parsed = parse(field, rawValue, label);
      const old = entries[field];
      if (old.sources.length < 3) old.sources.push(source);
      if (old.state === 'conflicting') continue;
      if (parsed === null) {
        if (old.state === 'found') {
          old.state = 'conflicting';
          old.value = null;
          old.unit = null;
        } else old.state = 'unsupported';
        old.confidence = 'none';
      } else if (old.state === 'missing') {
        old.state = 'found';
        old.value = parsed.value;
        old.rawValue = rawValue;
        old.unit = parsed.unit;
        old.confidence = page.origin === 'ocr' ? 'review' : 'high';
        old.extraction = page.origin === 'ocr' ? 'ocr' : 'direct_text';
      } else if (old.state !== 'found' || old.value !== parsed.value || old.unit !== parsed.unit) {
        old.state = 'conflicting';
        old.value = null;
        old.unit = null;
        old.confidence = 'none';
      } else if (page.origin === 'ocr') old.confidence = 'review';
      if (parsed === null && old.rawValue === null) old.rawValue = rawValue;
    }
  }
  return entries;
}
