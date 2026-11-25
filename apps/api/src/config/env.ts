import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test']),
  PORT: z.coerce.number().int().min(1).max(65535),
  HOST: z.string().min(1),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  WEB_ORIGINS: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((v) => v.trim()))
    .refine((origins) =>
      origins.every((v) => {
        try {
          const u = new URL(v);
          return ['http:', 'https:'].includes(u.protocol) && u.origin === v && !v.includes('*');
        } catch {
          return false;
        }
      }),
    ),
  AI_PROVIDER: z.literal('mock'),
  STORAGE_PROVIDER: z.literal('local'),
  LOCAL_STORAGE_PATH: z.string().min(1),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw Error(
    'Check API environment variables: ' +
      parsed.error.issues.map((i) => i.path.join('.')).join(', '),
  );
export const env = parsed.data;
