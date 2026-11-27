import { normalizeVn } from './intelligence-rules.js';

// Model text is supplementary. Typed blocks remain the only source of financial facts.
export function safeNarrative(value: string, _locale: 'vi-VN' | 'en-US'): string | null {
  const text = value.trim();
  if (!text || text.length > 350 || /\p{N}|[₫$€£%]|https?:\/\/|www\./iu.test(text)) return null;
  const normalized = normalizeVn(text);
  if (
    /\b(?:eligible|qualify|approved|guarantee|afford(?:able|ability)?|should borrow|apply now|api key|secret|system prompt|duoc duyet|du dieu kien|chac chan|bao dam|nen vay|dang ky ngay|lai|interest|rates?|fees?|phi|free|mien phi|du kha nang)\b/u.test(
      normalized,
    )
  )
    return null;
  return text;
}
