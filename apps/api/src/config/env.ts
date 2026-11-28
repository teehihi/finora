import 'dotenv/config';
import { isAbsolute } from 'node:path';
import { createWebOrigins } from './dev-network.js';
import { z } from 'zod';
import { matchWeightsSchema } from '@finora/contracts';
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535),
    HOST: z.string().min(1),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(1).default(0),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
    BETTER_AUTH_SECRET: z.string().min(32),
    SMTP_HOST: z.string().trim().min(1).default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_FROM: z.email().default('finora@example.test'),
    SMTP_MODE: z.enum(['local', 'starttls', 'tls']).default('local'),
    FINORA_REMINDER_EMAIL_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
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
    AI_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
    OPENAI_API_KEY: z.string().trim().optional(),
    OPENAI_BASE_URL: z.url({ protocol: /^https?$/ }).default('https://api.openai.com/v1'),
    OPENAI_MODEL: z
      .string()
      .trim()
      .regex(/^[\w.:-]{1,160}$/)
      .default('gpt-5.4-mini'),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
    OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(16).max(4096).default(450),
    OPENAI_RETRY_COUNT: z.coerce.number().int().min(0).max(3).default(1),
    OPENAI_RETRY_DELAY_MS: z.coerce.number().int().min(0).max(2000).default(250),
    ANTHROPIC_AUTH_TOKEN: z.string().trim().optional(),
    ANTHROPIC_BASE_URL: z.url({ protocol: /^https?$/ }).default('https://api.anthropic.com'),
    ANTHROPIC_MODEL: z
      .string()
      .trim()
      .regex(/^[\w.:-]{1,160}$/)
      .default('claude-sonnet-5'),
    ANTHROPIC_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
    ANTHROPIC_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(16).max(4096).default(1024),
    ANTHROPIC_RETRY_COUNT: z.coerce.number().int().min(0).max(3).default(1),
    ANTHROPIC_RETRY_DELAY_MS: z.coerce.number().int().min(0).max(2000).default(250),
    FINORA_AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(60000).default(24000),
    FINORA_AI_MAX_ROUNDS: z.coerce.number().int().min(1).max(4).default(2),
    FINORA_AI_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(12),
    FINORA_MATCH_WEIGHTS: z
      .string()
      .default('35,25,20,10,10')
      .transform((value, ctx) => {
        const numbers = value.split(',').map(Number);
        const parsed = matchWeightsSchema.safeParse({
          monthlyAffordability: numbers[0],
          totalCost: numbers[1],
          resilience: numbers[2],
          termSuitability: numbers[3],
          transparency: numbers[4],
        });
        if (numbers.length !== 5 || !parsed.success) {
          ctx.addIssue({
            code: 'custom',
            message: 'Five integer weights summing to 100 required.',
          });
          return z.NEVER;
        }
        return parsed.data;
      }),
    FINORA_MATCH_AFFORDABILITY_TARGET: z.coerce.number().min(0.05).max(0.8).default(0.35),
    FINORA_MATCH_STRESS_PERCENT: z.coerce.number().int().min(0).max(80).default(20),
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
    if (config.NODE_ENV === 'production') {
      const databasePassword = new URL(config.DATABASE_URL).password;
      if (databasePassword.length < 16 || databasePassword.startsWith('replace-with-'))
        issue('DATABASE_URL', 'Production database credentials must be set to a long secret.');
      if (config.BETTER_AUTH_SECRET.startsWith('replace-with-'))
        issue('BETTER_AUTH_SECRET', 'Replace the example authentication secret.');
      if (config.TRUST_PROXY_HOPS !== 1)
        issue('TRUST_PROXY_HOPS', 'Production requires one trusted HTTPS reverse proxy hop.');
      if (!config.BETTER_AUTH_URL.startsWith('https://'))
        issue('BETTER_AUTH_URL', 'Production authentication requires HTTPS.');
      if (config.WEB_ORIGINS.some((origin) => !origin.startsWith('https://')))
        issue('WEB_ORIGINS', 'Production browser origins require HTTPS.');
      if (config.SMTP_MODE === 'local') issue('SMTP_MODE', 'Production email requires TLS.');
      if (!isAbsolute(config.LOCAL_STORAGE_PATH))
        issue(
          'LOCAL_STORAGE_PATH',
          'Production document storage requires an absolute persistent path.',
        );
      if (config.AI_PROVIDER === 'openai' && !config.OPENAI_BASE_URL.startsWith('https://'))
        issue('OPENAI_BASE_URL', 'Production external AI requires HTTPS.');
      if (config.AI_PROVIDER === 'anthropic' && !config.ANTHROPIC_BASE_URL.startsWith('https://'))
        issue('ANTHROPIC_BASE_URL', 'Production external AI requires HTTPS.');
    }
    if (
      !!config.GOOGLE_CLIENT_ID !== !!config.GOOGLE_CLIENT_SECRET ||
      (config.GOOGLE_CLIENT_ID && !config.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com'))
    ) {
      issue('GOOGLE_CLIENT_ID', 'Set a Web application client ID and its matching server secret.');
    }
    if (config.AI_PROVIDER === 'openai' && !config.OPENAI_API_KEY)
      issue('OPENAI_API_KEY', 'A server-only API key is required when AI_PROVIDER is openai.');
    if (config.AI_PROVIDER === 'anthropic' && !config.ANTHROPIC_AUTH_TOKEN)
      issue(
        'ANTHROPIC_AUTH_TOKEN',
        'A server-only token is required when AI_PROVIDER is anthropic.',
      );
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
