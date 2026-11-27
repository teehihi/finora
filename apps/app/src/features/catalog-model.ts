import type { Product } from '@finora/contracts';

export const categories = ['all', 'personal', 'education', 'home'] as const;
export type Category = (typeof categories)[number];
export const maxRates = ['all', '10', '12', '15'] as const;

function normalize(s: string) {
  return s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function filterProducts(
  products: readonly Product[],
  query: string,
  category: Category,
  max: (typeof maxRates)[number],
) {
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return products.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (max === 'all' || p.rateMax <= Number(max)) &&
      terms.every((term) => normalize([p.name, p.nameEn, p.institution].join(' ')).includes(term)),
  );
}
