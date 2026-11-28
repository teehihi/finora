import { randomBytes } from 'node:crypto';

const base = {
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  TRUST_PROXY_HOPS: '1',
  PORT: '3000',
  DATABASE_URL: `postgresql://finora:${randomBytes(24).toString('hex')}@db.internal:5432/finora`,
  BETTER_AUTH_URL: 'https://api.finora.example.test',
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
  WEB_ORIGINS: 'https://finora.example.test',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_FROM: 'noreply@finora.example.test',
  SMTP_MODE: 'starttls',
  AI_PROVIDER: 'mock',
  STORAGE_PROVIDER: 'local',
  LOCAL_STORAGE_PATH: 'D:\\finora-private',
};

async function load(overrides: Record<string, string> = {}) {
  const previous = process.env;
  process.env = {
    ...previous,
    ANTHROPIC_AUTH_TOKEN: '',
    OPENAI_API_KEY: '',
    GOOGLE_CLIENT_SECRET: '',
    APPLE_CLIENT_SECRET: '',
    SMTP_PASSWORD: '',
    ...base,
    ...overrides,
  };
  jest.resetModules();
  try {
    const { env, webOrigins } = await import('../src/config/env.js');
    return { nodeEnv: env.NODE_ENV, webOrigins: webOrigins() };
  } finally {
    process.env = previous;
    jest.resetModules();
  }
}

describe('production API configuration', () => {
  it('boots with a secure production origin and server-only secrets', async () => {
    const config = await load();
    expect(config.nodeEnv).toBe('production');
    expect(config.webOrigins).toEqual(['https://finora.example.test']);
  });

  it('rejects HTTP auth and browser origins in production', async () => {
    await expect(load({ BETTER_AUTH_URL: 'http://api.finora.example.test' })).rejects.toThrow(
      'BETTER_AUTH_URL',
    );
    await expect(load({ WEB_ORIGINS: 'http://finora.example.test' })).rejects.toThrow(
      'WEB_ORIGINS',
    );
  });

  it('requires exactly one trusted reverse proxy hop in production', async () => {
    await expect(load({ TRUST_PROXY_HOPS: '0' })).rejects.toThrow('TRUST_PROXY_HOPS');
    await expect(load({ TRUST_PROXY_HOPS: '2' })).rejects.toThrow('TRUST_PROXY_HOPS');
  });

  it('rejects plaintext SMTP outside local development', async () => {
    await expect(load({ SMTP_MODE: 'local', SMTP_HOST: '127.0.0.1' })).rejects.toThrow('SMTP_MODE');
  });

  it('rejects an ephemeral relative document path in production', async () => {
    await expect(load({ LOCAL_STORAGE_PATH: '.data/uploads' })).rejects.toThrow(
      'LOCAL_STORAGE_PATH',
    );
  });

  it('rejects plaintext external AI endpoints in production', async () => {
    await expect(
      load({
        AI_PROVIDER: 'openai',
        OPENAI_API_KEY: 'synthetic-key',
        OPENAI_BASE_URL: 'http://localhost:8000/v1',
      }),
    ).rejects.toThrow('OPENAI_BASE_URL');
    await expect(
      load({
        AI_PROVIDER: 'anthropic',
        ANTHROPIC_AUTH_TOKEN: 'synthetic-token',
        ANTHROPIC_BASE_URL: 'http://localhost:8000',
      }),
    ).rejects.toThrow('ANTHROPIC_BASE_URL');
  });

  it('rejects the committed production example credentials', async () => {
    await expect(
      load({ BETTER_AUTH_SECRET: 'replace-with-at-least-32-random-characters' }),
    ).rejects.toThrow('BETTER_AUTH_SECRET');
    await expect(
      load({
        DATABASE_URL:
          'postgresql://finora:replace-with-long-random-password@db.internal:5432/finora',
      }),
    ).rejects.toThrow('DATABASE_URL');
    await expect(
      load({ DATABASE_URL: 'postgresql://finora:short@db.internal:5432/finora' }),
    ).rejects.toThrow('DATABASE_URL');
  });
});
