// Standalone acceptance suite for a disposable LOCAL database and running Mailpit.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaClient } from '@finora/database';

function loopbackUrl(value, name) {
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error(`${name} verification requires a loopback URL`);
  return url;
}

const base = loopbackUrl(process.env.BETTER_AUTH_URL, 'API').origin;
const origin = loopbackUrl((process.env.WEB_ORIGINS || '').split(',')[0], 'Browser').origin;
const mailpit = loopbackUrl(
  process.env.FINORA_MAILPIT_URL || 'http://127.0.0.1:8025',
  'Mailpit',
).origin;
loopbackUrl(process.env.DATABASE_URL, 'Database');
if (process.env.FINORA_AUTH_TEST_DB !== 'disposable')
  throw new Error('Set FINORA_AUTH_TEST_DB=disposable only for the dedicated local test database');

const db = new PrismaClient();
const runId = randomUUID();
const email = (label) => `finora-auth-${runId}-${label}@example.test`;
const password = randomUUID();
const sendPath = '/api/auth/email-otp/send-verification-otp';
const signInPath = '/api/auth/sign-in/email-otp';

function client() {
  const jar = new Map();
  return async (path, data, method = data ? 'POST' : 'GET') => {
    const headers = {
      Origin: origin,
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
    };
    if (data) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, {
      method,
      headers,
      redirect: 'manual',
      body: data ? JSON.stringify(data) : undefined,
    });
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const i = pair.indexOf('=');
      if (i === -1) continue;
      const key = pair.slice(0, i);
      const val = pair.slice(i + 1);
      if (!val || /; max-age=0(?:;|$)/i.test(raw)) jar.delete(key);
      else jar.set(key, val);
    }
    const body = await res.json().catch(() => null);
    return { status: res.status, body, location: res.headers.get('location') };
  };
}

async function mailCode(recipient) {
  for (let retry = 0; retry < 30; retry++) {
    const inbox = await fetch(`${mailpit}/api/v1/messages?limit=100`).then((r) => r.json());
    const message = inbox.messages.find((m) => m.To?.some((x) => x.Address === recipient));
    if (message) {
      const content = await fetch(`${mailpit}/api/v1/message/${message.ID}`).then((r) => r.json());
      const code = content.Text?.match(/(?:^|\n)(\d{6})(?:\r?\n|$)/)?.[1];
      assert.ok(code, 'The real Mailpit message has a six-digit code in its text part');
      assert.ok(content.HTML?.includes(code), 'The real Mailpit message has the same code in HTML');
      assert.ok(!message.Subject?.includes(code), 'The mail subject does not contain the code');
      return code;
    }
    await sleep(150);
  }
  assert.fail('Mailpit did not receive the verification email');
}

async function requestCode(agent, recipient, type = 'sign-in') {
  const result = await agent(sendPath, { email: recipient, type });
  assert.equal(result.status, 200, 'OTP request should succeed');
  assert.deepEqual(result.body, { success: true }, 'OTP request exposes no code');
  return mailCode(recipient);
}

try {
  const guest = client();
  const visitor = client();
  const signup = email('new');
  const providers = await guest('/api/auth/providers');
  assert.equal(providers.status, 200);
  assert.equal(providers.body.emailOtp, true);
  assert.equal(typeof providers.body.google, 'boolean');
  if (!providers.body.google) {
    const social = await guest('/api/auth/sign-in/social', {
      provider: 'google',
      callbackURL: origin,
    });
    assert.ok(social.status >= 400, 'Unconfigured Google OAuth fails closed');
  } else {
    // Test local initiation and the cancellation round-trip without calling Google.
    const cancelled = client();
    const errorCallbackURL = origin + '/auth?oauth=error';
    const start = await cancelled('/api/auth/sign-in/social', {
      provider: 'google',
      callbackURL: origin + '/home',
      errorCallbackURL,
      disableRedirect: true,
    });
    assert.equal(start.status, 200);
    const authorize = new URL(start.body.url);
    assert.equal(authorize.origin, 'https://accounts.google.com');
    assert.equal(authorize.searchParams.get('redirect_uri'), base + '/api/auth/callback/google');
    assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(authorize.searchParams.get('code_challenge'));
    const state = authorize.searchParams.get('state');
    assert.ok(state);
    const callback = await cancelled(
      '/api/auth/callback/google?' + new URLSearchParams({ error: 'access_denied', state }),
    );
    assert.equal(callback.status, 302);
    const returned = new URL(callback.location);
    assert.equal(returned.origin + returned.pathname, origin + '/auth');
    assert.equal(returned.searchParams.get('oauth'), 'error');
    assert.equal(returned.searchParams.get('error'), 'access_denied');
    assert.equal((await cancelled('/api/account')).status, 401);
  }
  assert.equal((await guest('/api/account')).status, 401);
  const otp = await requestCode(guest, signup);
  assert.equal(
    (await guest(sendPath, { email: signup.toUpperCase(), type: 'sign-in' })).status,
    429,
  );
  const row = await db.verification.findFirstOrThrow({
    where: { identifier: `sign-in-otp-${signup}` },
  });
  assert.ok(row.value.split(':')[0] !== otp, 'OTP is not persisted as plaintext');
  assert.ok(row.expiresAt.getTime() > Date.now() + 200_000);
  assert.ok(row.expiresAt.getTime() < Date.now() + 302_000);

  const wrong = otp === '000000' ? '111111' : '000000';
  assert.ok((await guest(signInPath, { email: signup, otp: wrong })).status >= 400);
  const signed = await guest(signInPath, { email: signup, otp });
  assert.equal(signed.status, 200);
  assert.equal(signed.body.user.email, signup);
  assert.equal(signed.body.user.emailVerified, true);
  assert.equal((await guest('/api/auth/get-session')).body.user.id, signed.body.user.id);
  assert.ok((await visitor(signInPath, { email: signup, otp })).status >= 400);
  assert.equal((await visitor('/api/account')).status, 401);
  assert.equal((await guest('/api/account')).status, 200);

  const expiredEmail = email('expiry');
  const expiredOtp = await requestCode(guest, expiredEmail);
  // Only modify this run's synthetic verification row to simulate passage of time.
  await db.verification.updateMany({
    where: { identifier: `sign-in-otp-${expiredEmail}` },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  assert.ok((await guest(signInPath, { email: expiredEmail, otp: expiredOtp })).status >= 400);

  const lockedEmail = email('attempts');
  const lockedOtp = await requestCode(guest, lockedEmail);
  for (let i = 0; i < 5; i++) {
    const invalid = lockedOtp === '555555' ? '666666' : '555555';
    assert.ok((await guest(signInPath, { email: lockedEmail, otp: invalid })).status >= 400);
  }
  assert.ok((await guest(signInPath, { email: lockedEmail, otp: lockedOtp })).status >= 400);

  const legacy = client();
  const legacyEmail = email('legacy');
  const created = await legacy('/api/auth/sign-up/email', {
    name: 'Legacy fixture',
    email: legacyEmail,
    password,
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.user.emailVerified, false);
  assert.equal(
    (await legacy('/api/auth/link-social', { provider: 'google', callbackURL: origin })).status,
    403,
  );
  const ownedProfile = { income: 16000000, expenses: 5000000, debt: 1000000 };
  assert.equal((await legacy('/api/profile', ownedProfile, 'PUT')).status, 200);
  assert.equal(
    (await visitor(sendPath, { email: legacyEmail, type: 'email-verification' })).status,
    403,
  );
  const legacyOtp = await requestCode(legacy, legacyEmail, 'email-verification');
  assert.equal(
    (await visitor('/api/auth/email-otp/verify-email', { email: legacyEmail, otp: legacyOtp }))
      .status,
    403,
  );
  assert.equal(
    (await legacy('/api/auth/email-otp/verify-email', { email: legacyEmail, otp: legacyOtp }))
      .status,
    200,
  );
  assert.equal((await legacy('/api/auth/get-session')).body.user.emailVerified, true);
  const existingPassword = client();
  assert.equal(
    (await existingPassword('/api/auth/sign-in/email', { email: legacyEmail, password })).body.user
      .id,
    created.body.user.id,
  );
  assert.deepEqual((await existingPassword('/api/account')).body.profile, ownedProfile);
  assert.equal(
    (await guest('/api/account')).body.profile,
    null,
    'Separate OTP account cannot see legacy financial profile',
  );

  // Comparison of anonymous requests for a known and a new email (the first recipient
  // window is intentionally tested with a second, pre-existing synthetic account).
  const unverified = client();
  const claimEmail = email('claim');
  const claimed = await unverified('/api/auth/sign-up/email', {
    name: 'Existing fixture',
    email: claimEmail,
    password,
  });
  assert.equal(claimed.status, 200);
  const otpOwner = client();
  const claimOtp = await requestCode(otpOwner, claimEmail);
  const ownerSignIn = await otpOwner(signInPath, { email: claimEmail, otp: claimOtp });
  assert.equal(ownerSignIn.status, 200);
  assert.equal(
    ownerSignIn.body.user.id,
    claimed.body.user.id,
    'Mailbox proof preserves the existing user ID',
  );
  assert.equal(
    (await unverified('/api/account')).status,
    401,
    'The pre-verification session was revoked',
  );
  assert.ok(
    (await unverified('/api/auth/sign-in/email', { email: claimEmail, password })).status >= 400,
  );

  assert.equal((await guest('/api/auth/sign-out', {})).status, 200);
  assert.equal((await guest('/api/account')).status, 401);
  console.log(
    'Auth local acceptance passed: SMTP/Mailpit, OTP cooldown, invalid/expired/replay/attempt limits, new and existing IDs, password verification and preservation, unverified credential recovery, session restore, sign-out, provider gating or Google initiation/cancellation, and ownership.',
  );
} finally {
  await db.$disconnect();
}
