import type { IntelligenceRequest, Profile } from '@finora/contracts';
import type { PreviousTurn } from './intelligence-context.js';
import { interpret, normalizeVn, type Intent } from './intelligence-rules.js';
import { safeNarrative, type NarrativeEvidence } from './intelligence-narrative.js';

const fields = {
  principal:
    /\b(?:so tien vay|(?:muon |du dinh )?vay bao nhieu|loan amount|(?:how much|amount).{0,35}borrow)\b/u,
  income: /\b(?:thu nhap|luong|income|salary)\b/u,
  expenses:
    /\b(?:chi phi (?:sinh hoat|thiet yeu|moi thang|cua toi)|chi tieu|(?:my |monthly )expenses)\b/u,
  debt: /\b(?:no hien tai|tra no|debt)\b/u,
  currentSavings: /\b(?:tiet kiem|savings)\b/u,
  minimumReserve: /\b(?:quy du phong|minimum reserve)\b/u,
  preferredPayment: /\b(?:tra toi da|muc tra mong muon|preferred payment)\b/u,
  months: /\b(?:ky han|bao nhieu thang|loan term)\b/u,
} as const;
type RecallField = keyof typeof fields;

export function recallQuestion(prompt: string) {
  const text = normalizeVn(prompt);
  if (
    !/\b(?:bao nhieu|how much|what (?:is|was)|nho lai|nhac lai|remember|recall)\b/u.test(text) ||
    /\b(?:gia su|neu|thi sao|con lai|tinh|co the vay|co the tra|giai thich|afford|calculate|explain|what if)\b/u.test(
      text,
    )
  )
    return undefined;
  // Identify the field before a correction mentioned in the question.
  const field = (Object.keys(fields) as RecallField[]).find((key) => fields[key].test(text));
  return field
    ? { field, original: /\b(?:ban dau|luc dau|truoc khi|original|initial|before)\b/u.test(text) }
    : undefined;
}

export const asksForSummary = (prompt: string) =>
  /\b(?:tong hop (?:ho so|toan bo thong tin|thong tin cua toi)|tom tat (?:ho so|thong tin)|summari[sz]e (?:my|all|the financial))\b/u.test(
    normalizeVn(prompt),
  );

const owners = {
  principal: ['Khoản vay bạn đang cân nhắc', 'The loan you are considering'],
  income: ['Thu nhập mỗi tháng của bạn', 'Your monthly income'],
  expenses: ['Chi phí mỗi tháng của bạn', 'Your monthly expenses'],
  debt: ['Khoản trả nợ hiện tại mỗi tháng', 'Your current monthly debt payment'],
  currentSavings: ['Tiết kiệm hiện có của bạn', 'Your current savings'],
  minimumReserve: ['Quỹ dự phòng tối thiểu bạn muốn giữ', 'Your minimum reserve'],
  preferredPayment: ['Mức trả tối đa mỗi tháng bạn muốn', 'Your preferred monthly payment limit'],
  months: ['Kỳ hạn vay bạn muốn', 'Your preferred loan term'],
} as const;

export function recallAnswer(
  query: NonNullable<ReturnType<typeof recallQuestion>>,
  context: Partial<Intent>,
  profile: Profile | null,
  history: PreviousTurn[],
  locale: IntelligenceRequest['locale'],
) {
  const { field, original } = query;
  const vi = locale === 'vi-VN';
  const saved =
    field === 'income' || field === 'expenses' || field === 'debt' ? profile?.[field] : undefined;
  const stated = (original ? [...history].reverse() : []).flatMap(({ prompt }) => {
    if (recallQuestion(prompt)) return [];
    const candidate = interpret(prompt);
    return candidate.blocked || candidate[field] === undefined ? [] : [candidate];
  })[0];
  const amount = original ? stated?.[field] : (context[field] ?? saved);
  const label = owners[field][vi ? 0 : 1];
  if (amount === undefined)
    return vi
      ? `Mình chưa tìm thấy thông tin này${original ? ' trong phần lịch sử còn lưu' : ''}.`
      : `I could not find that information${original ? ' in the available history' : ''}.`;
  const number = new Intl.NumberFormat(locale).format(amount);
  const units = field === 'months' ? (vi ? ' tháng' : ' months') : vi ? ' ₫' : ' VND';
  const repair =
    field === 'principal' && (original ? stated?.vehicleRepair : context.vehicleRepair);
  const approximate =
    field !== 'months' &&
    (original ? stated?.amountStatus?.[field] : context.amountStatus?.[field]) === 'approximate';
  const text = repair
    ? vi
      ? `Bạn muốn vay ${number} ₫ để sửa xe.`
      : `You want to borrow ${number} VND to repair your vehicle.`
    : vi
      ? `${label}${original ? ' ban đầu' : ''} là ${approximate ? 'khoảng ' : ''}${number}${units}.`
      : `${original ? 'Initially, ' : ''}${label}${original ? ' was' : ' is'} ${approximate ? 'about ' : ''}${number}${units}.`;
  const provenance: NarrativeEvidence['provenance'] =
    original || context[field] !== undefined ? 'USER_PROVIDED' : 'CONFIRMED_PROFILE';
  return (
    safeNarrative(text, locale, [{ text, provenance }]) ??
    (vi ? 'Mình chưa thể trả lời từ dữ liệu đã lưu.' : 'I could not answer from the stored data.')
  );
}
