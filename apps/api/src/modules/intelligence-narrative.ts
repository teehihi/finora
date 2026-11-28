import { normalizeVn } from './intelligence-rules.js';
import type { IntelligenceBlock, IntelligenceRequest } from '@finora/contracts';

export type NarrativeEvidence = {
  provenance:
    | 'USER_PROVIDED'
    | 'CONFIRMED_PROFILE'
    | 'VERIFIED_TOOL_RESULT'
    | 'VERIFIED_CATALOG'
    | 'DOCUMENT_EVIDENCE'
    | 'EXPLICIT_SIMULATION'
    | 'UNKNOWN'
    | 'UNSUPPORTED';
  // Complete, server-rendered sentence. A matching number alone proves nothing.
  text: string;
};
type Rejection = 'format' | 'unverified_amount' | 'approval_or_action' | 'unverified_terms';

export function evidenceFromAnalysis(
  blocks: IntelligenceBlock[],
  locale: IntelligenceRequest['locale'],
): NarrativeEvidence[] {
  const vi = locale === 'vi-VN';
  const amount = (value: number) => new Intl.NumberFormat(locale).format(value);
  return blocks.flatMap((block): NarrativeEvidence[] => {
    if (block.kind === 'affordability')
      return [
        {
          provenance: 'VERIFIED_TOOL_RESULT',
          text: vi
            ? `Dòng tiền trước khoản vay mới là ${amount(block.cashFlow)} ₫/tháng.`
            : `Cash flow before the new loan is ${amount(block.cashFlow)} VND per month.`,
        },
      ];
    if (block.kind === 'scenario')
      return [
        {
          provenance: 'EXPLICIT_SIMULATION',
          text: vi
            ? `Kỳ trả đầu theo giả định mô phỏng là ${amount(block.firstPayment)} ₫.`
            : `The assumed first payment is ${amount(block.firstPayment)} VND.`,
        },
      ];
    return [];
  });
}

export function validateNarrative(value: string, evidence: readonly NarrativeEvidence[] = []) {
  const text = value.trim();
  const reject = (reason: Rejection) => ({ text: null, reason });
  if (!text || text.length > 350 || /https?:\/\/|www\./iu.test(text)) return reject('format');
  const normalized = normalizeVn(text);
  if (
    /\b(?:eligible|qualify|approved|guarantee|should borrow|apply now|api key|secret|system prompt|duoc duyet|du dieu kien|chac chan|bao dam|nen vay|dang ky ngay|da chuyen tien|da danh dau|da luu|(?:i|we) (?:paid|saved|transferred))\b/u.test(
      normalized,
    )
  )
    return reject('approval_or_action');
  if (
    evidence.some(
      (fact) =>
        fact.text === text &&
        fact.provenance !== 'UNKNOWN' &&
        fact.provenance !== 'UNSUPPORTED' &&
        (fact.provenance !== 'EXPLICIT_SIMULATION' ||
          /\b(?:gia dinh|mo phong|assum(?:ed|ption|ing)|hypothetical|simulation)\b/u.test(
            normalized,
          )),
    )
  )
    return { text, reason: null };
  if (/\p{N}|[₫$€£%]|\b(?:trieu|nghin|million|thousand|vnd|dong)\b/u.test(normalized))
    return reject('unverified_amount');
  if (
    /\b(?:lai|interest|rates?|fees?|phi|free|mien phi|afford(?:able|ability)?|du kha nang|payment|repayments?|tra no|ngan hang|lender|no debt|khong no)\b/u.test(
      normalized,
    ) &&
    !/^(?:minh co the (?:giai thich|giup ban so sanh)|i can (?:explain|help compare)) (?:cach tinh lai|ky han tra no|repayment terms|how interest is calculated)[.!]?$/u.test(
      normalized,
    )
  )
    return reject('unverified_terms');
  return { text, reason: null };
}

export function safeNarrative(
  value: string,
  _locale: 'vi-VN' | 'en-US',
  evidence?: readonly NarrativeEvidence[],
): string | null {
  return validateNarrative(value, evidence).text;
}
