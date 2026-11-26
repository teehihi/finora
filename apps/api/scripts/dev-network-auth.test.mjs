import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expo } from '@better-auth/expo';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';

test('LAN OTP can issue a host-only cookie with a stable loopback auth URL', async () => {
  const messages = new Map();
  let current = '192.168.4.21';
  const auth = betterAuth({
    baseURL: 'http://localhost:3000',
    secret: 'Synthetic-key-for-local-LAN-auth-QA-only-32-characters',
    database: memoryAdapter({ user: [], account: [], session: [], verification: [] }),
    trustedOrigins: () => ['http://' + current + ':8081', 'finora://'],
    advanced: {
      cookiePrefix: 'finora',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    logger: { level: 'error', disabled: true },
    plugins: [
      expo(),
      emailOTP({
        async sendVerificationOTP({ email, otp }) {
          messages.set(email, otp);
        },
      }),
    ],
  });

  async function send(path, { origin, host = current, cookie, body }) {
    const headers = {
      ...(origin && { [origin === 'finora://' ? 'expo-origin' : 'origin']: origin }),
      ...(cookie && { cookie }),
    };
    if (body) headers['content-type'] = 'application/json';
    return auth.handler(
      new Request('http://' + host + ':3000/api/auth/' + path, {
        headers,
        ...(body && { method: 'POST', body: JSON.stringify(body) }),
      }),
    );
  }

  async function signIn(email, origin) {
    const sent = await send('email-otp/send-verification-otp', {
      origin,
      body: { email, type: 'sign-in' },
    });
    assert.equal(sent.status, 200, await sent.text());
    const verified = await send('sign-in/email-otp', {
      origin,
      body: { email, otp: messages.get(email) },
    });
    assert.equal(verified.status, 200, await verified.text());
    const token = verified.headers
      .getSetCookie()
      .find((value) => value.startsWith('finora.session_token='));
    assert.match(token, /; HttpOnly(?:;|$)/i);
    assert.doesNotMatch(token, /; Domain=/i);
    const response = await send('get-session', { cookie: token.split(';', 1)[0], origin });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.email, email);
  }

  await signIn('browser@example.test', 'http://' + current + ':8081');
  const staleOrigin = 'http://' + current + ':8081';
  current = '10.4.8.34';
  const stale = await send('email-otp/send-verification-otp', {
    origin: staleOrigin,
    body: { email: 'stale@example.test', type: 'sign-in' },
  });
  assert.equal(stale.status, 403);
  await signIn('new-browser@example.test', 'http://' + current + ':8081');
  await signIn('expo@example.test', 'finora://');
});
