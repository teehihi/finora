import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const rows = [
  [
    'personal-flex',
    'Chi tiêu linh hoạt',
    'Flexible personal loan',
    'An Bình Studio',
    'personal',
    9,
    15,
    5000000,
    200000000,
    6,
    60,
    'annuity',
    null,
  ],
  [
    'study-step',
    'Đồng hành học tập',
    'Education companion',
    'Mầm Finance Lab',
    'education',
    6,
    10,
    10000000,
    300000000,
    12,
    72,
    'equalPrincipal',
    0,
  ],
  [
    'home-renew',
    'Chăm chút tổ ấm',
    'Home improvements',
    'Nhà Studio',
    'home',
    8,
    12,
    30000000,
    700000000,
    12,
    120,
    'equalPrincipal',
    500000,
  ],
  [
    'personal-short',
    'Kế hoạch ngắn hạn',
    'Short-term plan',
    'An Bình Studio',
    'personal',
    7,
    11,
    3000000,
    50000000,
    3,
    24,
    'flat',
    150000,
  ],
];
try {
  await db.$transaction(
    rows.map(
      ([
        id,
        name,
        nameEn,
        institution,
        category,
        rateMin,
        rateMax,
        amountMin,
        amountMax,
        monthsMin,
        monthsMax,
        method,
        fee,
      ]) => {
        const data = {
          id,
          name,
          nameEn,
          institution,
          category,
          rateMin,
          rateMax,
          amountMin,
          amountMax,
          monthsMin,
          monthsMax,
          method,
          fee,
          source: 'Finora Sandbox · 2026-11',
        };
        return db.loanProduct.upsert({ where: { id }, create: data, update: data });
      },
    ),
  );
  console.log('Seeded four synthetic products.');
} finally {
  await db.$disconnect();
}
