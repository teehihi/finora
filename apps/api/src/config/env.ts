import 'dotenv/config';
import { createWebOrigins } from './dev-network.js';
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
    AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
    OPENAI_API_KEY: z.string().trim().optional(),
    OPENAI_MODEL: z
      .string()
      .trim()
      .regex(/^[\w.:-]{1,160}$/)
      .default('gpt-5.4-mini'),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
    OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(16).max(4096).default(450),
    FINORA_AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(60000).default(24000),
    FINORA_AI_MAX_ROUNDS: z.coerce.number().int().min(1).max(4).default(2),
    FINORA_AI_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(12),
    STORAGE_PROVIDER: z.literal('local'),
    LOCAL_STORAGE_PATH: z.string().min(1),
    AVATAR_STORAGE_PROVIDER: z.enum(['local', 'r2', 's3']).default('local'),
    R2_ACCOUNT_ID: z.string().trim().optional(),
    R2_AVATAR_BUCKET: z.string().trim().optional(),
    R2_ACCESS_KEY_ID: z.string().trim().optional(),
    R2_SECRET_ACCESS_KEY: z.string().trim().optional(),
    S3_REGION: z.string().trim().optional(),
    S3_AVATAR_BUCKET: z.string().trim().optional(),
  })
  .superRefine((config, ctx) => {
    function issue(path: string, message: string) {
      ctx.addIssue({ code: 'custom', path: [path], message });
    }
    if (config.AVATAR_STORAGE_PROVIDER === 'r2') {
      if (!/^[a-f0-9]{32}$/.test(config.R2_ACCOUNT_ID ?? ''))
        issue('R2_ACCOUNT_ID', 'Set a Cloudflare account ID.');
      if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.R2_AVATAR_BUCKET ?? ''))
        issue('R2_AVATAR_BUCKET', 'Set the private R2 bucket name.');
      if (!config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY)
        issue('R2_ACCESS_KEY_ID', 'Set both server-only R2 credentials.');
    }
    if (config.AVATAR_STORAGE_PROVIDER === 's3') {
      if (!config.S3_REGION) issue('S3_REGION', 'Set the AWS region for the avatar bucket.');
      if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.S3_AVATAR_BUCKET ?? ''))
        issue('S3_AVATAR_BUCKET', 'Set the private S3 bucket name.');
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
    if (config.AI_PROVIDER === 'openai' && !config.OPENAI_API_KEY)
      issue('OPENAI_API_KEY', 'A server-only API key is required when AI_PROVIDER is openai.');
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

// Only the explicit local development launcher enables automatic LAN browser origins.
export const webOrigins = createWebOrigins(
  env.WEB_ORIGINS,
  env.NODE_ENV === 'development' && process.env.FINORA_DEV_LAN === '1',
);
