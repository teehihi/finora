import { homeCopy, type Locale } from '@finora/i18n';

const shortcuts = [
  ['simulate', '/simulate/personal-flex', 'tinh lai khoan vay calculator interest'],
  ['repayments', '/repayments', 'ky thanh toan lich tra no due schedule payment'],
  ['compare', '/explore?mode=sample&intent=compare', 'doi chieu compare options'],
  ['documents', '/documents', 'doc hop dong giay to contract scan'],
  ['find', '/explore', 'tim khoan vay kham pha loan explore'],
  ['cashflowSearch', '/cashflow', 'thu chi dong tien income spending'],
  ['savedSearch', '/loans?pane=simulations', 'da luu mo phong saved simulation'],
  ['finButton', '/assistant', 'hoi fin tro ly ai assistant'],
] as const;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

// Intentionally local: no financial records, analytics, network or search history.
export function searchHomeServices(input: string, locale: Locale) {
  const copy = homeCopy(locale);
  const words = normalize(input).split(/\s+/).filter(Boolean);
  return shortcuts.flatMap(([key, href, aliases]) => {
    const label = copy[key];
    const haystack = normalize(label + ' ' + aliases);
    return words.every((word) => haystack.includes(word)) ? [{ label, href }] : [];
  });
}
