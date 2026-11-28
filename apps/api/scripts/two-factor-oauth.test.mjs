import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { splitSetCookieHeader } from 'better-auth/cookies';
import { finoraTwoFactor } from '../src/modules/two-factor.ts';

const origin = 'http://localhost:3000';
const secret = 'synthetic-only-finora-fixture-unused-outside-this-test';

function makeClient(auth) {
  const jar = new Map();
  function store(cookies) {
    for (const cookie of cookies) {
      const [pair] = cookie.split(';');
      const eq = pair.indexOf('=');
      if (/;\s*Max-Age=0(?:;|$)/i.test(cookie)) jar.delete(pair.slice(0, eq));
      else jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  return {
    store,
    async request(path, { method = 'GET', body, type = 'application/json' } = {}) {
      const headers = new Headers({ Origin: origin });
      headers.set('Cookie', [...jar].map(([name, value]) => name + '=' + value).join('; '));
      if (body) headers.set('Content-Type', type);
      const response = await auth.handler(
        new Request(origin + '/api/auth' + path, {
          method,
          headers,
          body: body && (type === 'application/json' ? JSON.stringify(body) : body),
        }),
      );
      store(response.headers.getSetCookie());
      return response;
    },
  };
}

async function oauth(client, provider, redirect, post = false) {
  const start = await client.request('/sign-in/social', {
    method: 'POST',
    body: { provider, callbackURL: redirect },
  });
  assert.equal(start.status, 200);
  const authorization = new URL((await start.json()).url);
  const state = authorization.searchParams.get('state');
  assert.ok(state);
  const query = new URLSearchParams({ code: 'accepted-test-code', state }).toString();
  const path = '/callback/' + provider;
  if (post) {
    const fromApple = await client.request(path, {
      method: 'POST',
      type: 'application/x-www-form-urlencoded',
      body: query,
    });
    assert.equal(fromApple.status, 302);
    const forwarded = new URL(fromApple.headers.get('Location'));
    assert.equal(forwarded.origin, origin);
    assert.equal(forwarded.pathname, '/api/auth' + path);
    return client.request(path + forwarded.search);
  }
  return client.request(path + '?' + query);
}

for (const provider of ['google', 'apple']) {
  test(`${provider} callback completes only after TOTP (${provider === 'apple' ? 'Expo handoff' : 'web'})`, async () => {
    const auth = betterAuth({
      appName: 'Finora',
      baseURL: origin,
      secret,
      database: memoryAdapter({
        user: [],
        account: [],
        session: [],
        verification: [],
        twoFactor: [],
      }),
      socialProviders: { [provider]: { clientId: 'test-client', clientSecret: 'test-secret' } },
      trustedOrigins: [origin, 'finora://'],
      advanced: { cookiePrefix: 'finora' },
      plugins: [finoraTwoFactor(), expo()],
    });
    const ctx = await auth.$context;
    const providerImpl = (await ctx.socialProviders).find((item) => item.id === provider);
    // Keep the real Better Auth OAuth state, callback, cookie and session code.
    // Only replace the external provider's exchange and identity, with synthetic data.
    providerImpl.validateAuthorizationCode = async ({ code }) => {
      assert.equal(code, 'accepted-test-code');
      return { accessToken: 'fixture-access-token' };
    };
    providerImpl.getUserInfo = async () => ({
      data: { sub: 'synthetic-' + provider },
      user: {
        id: 'synthetic-' + provider,
        email: provider + '@example.test',
        emailVerified: true,
        name: 'Fixture',
      },
    });

    const owner = makeClient(auth);
    const finish = '/auth?oauth=complete&returnTo=%2Fprofile%2Fpersonal';
    const native = provider === 'apple';
    const callbackURL = native ? 'finora://' + finish : origin + finish;
    const beforeEnrollment = await oauth(owner, provider, callbackURL, native);
    assert.equal(beforeEnrollment.status, 302);
    const initialSession = await (await owner.request('/get-session')).json();
    assert.equal(initialSession.user.email, provider + '@example.test');
    const enroll = await owner.request('/two-factor/enable', { method: 'POST', body: {} });
    assert.equal(enroll.status, 200);
    const key = new URL((await enroll.json()).totpURI).searchParams.get('secret');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const allBits = [...key]
      .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
      .join('');
    const secretText = Buffer.from(
      (allBits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)),
    ).toString();
    const { code } = await auth.api.generateTOTP({ body: { secret: secretText } });
    const confirm = await owner.request('/two-factor/verify-totp', {
      method: 'POST',
      body: { code },
    });
    assert.equal(confirm.status, 200);

    const other = makeClient(auth);
    const callback = await oauth(other, provider, callbackURL, native);
    assert.equal(callback.status, 302);
    const redirect = new URL(callback.headers.get('Location'));
    const deepLinkCookies = redirect.searchParams.get('cookie');
    if (native) {
      assert.ok(deepLinkCookies);
      const forwarded = makeClient(auth);
      forwarded.store(splitSetCookieHeader(deepLinkCookies));
      assert.deepEqual(await (await forwarded.request('/two-factor/status')).json(), {
        required: true,
      });
      assert.equal(await (await forwarded.request('/get-session')).json(), null);
      assert.ok(
        !splitSetCookieHeader(deepLinkCookies).some((cookie) =>
          /^finora\.session_token=[^;]/.test(cookie),
        ),
      );
      const response = await forwarded.request('/two-factor/verify-totp', {
        method: 'POST',
        body: { code },
      });
      assert.equal(response.status, 200);
      assert.equal(
        (await (await forwarded.request('/get-session')).json()).user.email,
        provider + '@example.test',
      );
      redirect.searchParams.delete('cookie');
    } else {
      assert.equal(deepLinkCookies, null);
      assert.deepEqual(await (await other.request('/two-factor/status')).json(), {
        required: true,
      });
      assert.equal(await (await other.request('/get-session')).json(), null);
      assert.ok(
        !callback.headers
          .getSetCookie()
          .some((cookie) => /^finora\.session_token=[^;]/.test(cookie)),
      );
      const response = await other.request('/two-factor/verify-totp', {
        method: 'POST',
        body: { code },
      });
      assert.equal(response.status, 200);
      assert.equal(
        (await (await other.request('/get-session')).json()).user.email,
        provider + '@example.test',
      );
    }
    assert.equal(redirect.toString(), callbackURL);
  });
}
