import 'dotenv/config';
import { z } from 'zod';
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test']),
    PORT: z.coerce.number().int().min(1).max(65535),
    HOST: z.string().min(1),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
    BETTER_AUTH_SECRET: z.string().min(32),
    SMTP_HOST: z.string().trim().min(1).default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_FROM: z.email().default('finora@example.test'),
    SMTP_MODE: z.enum(['local', 'starttls', 'tls']).default('local'),
    SMTP_USER: z.string().trim().optional(),
    SMTP_PASSWORD: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
    APPLE_CLIENT_ID: z.string().trim().optional(),
    APPLE_CLIENT_SECRET: z.string().trim().optional(),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().trim().optional(),
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
  })
  .superRefine((config, ctx) => {
    function issue(path: string, message: string) {
      ctx.addIssue({ code: 'custom', path: [path], message });
    }
    if (!!config.SMTP_USER !== !!config.SMTP_PASSWORD) {
      issue('SMTP_USER', 'Set both SMTP credentials or neither.');
    }
    if (config.SMTP_MODE === 'local') {
      if (!['localhost', '127.0.0.1', '::1'].includes(config.SMTP_HOST))
        issue('SMTP_HOST', 'Plaintext local SMTP is restricted to loopback.');
      if (config.SMTP_USER) issue('SMTP_USER', 'Use TLS for authenticated SMTP.');
    }
    if (
      !!config.GOOGLE_CLIENT_ID !== !!config.GOOGLE_CLIENT_SECRET ||
      (config.GOOGLE_CLIENT_ID && !config.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com'))
    ) {
      issue('GOOGLE_CLIENT_ID', 'Set a Web application client ID and its matching server secret.');
    }
    const apple = [
      config.APPLE_CLIENT_ID,
      config.APPLE_CLIENT_SECRET,
      config.APPLE_APP_BUNDLE_IDENTIFIER,
    ];
    if (
      apple.some(Boolean) &&
      (!apple.every(Boolean) || !config.BETTER_AUTH_URL.startsWith('https://'))
    ) {
      issue(
        'APPLE_CLIENT_ID',
        'Set Apple Service ID, client secret JWT, bundle ID, and HTTPS URL together.',
      );
    }
  });
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw Error(
    'Check API environment variables: ' +
      parsed.error.issues.map((i) => i.path.join('.')).join(', '),
  );
export const env = parsed.data;
