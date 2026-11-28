import { createHash, createHmac, createPrivateKey, randomUUID, sign } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { createLegacyAccount } from './legacy-fixture';

const api = 'http://localhost:3000/api/auth';
const inbox = 'http://127.0.0.1:8025';
const headers = { Origin: 'http://localhost:8081' };

function authenticatorCode(uri: string) {
  const key = new URL(uri).searchParams.get('secret');
  if (!key) throw new Error('Missing synthetic enrollment key');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...key].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('');
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac('sha1', bytes).update(counter).digest();
  return String((digest.readUInt32BE(digest[19]! & 15) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

async function mailCode(request: APIRequestContext, email: string) {
  const mail = await request.get(inbox + '/api/v1/search', {
    params: { query: `to:${email}`, limit: '1' },
  });
  const [message] = (await mail.json()).messages ?? [];
  if (!message) return null;
  const body = await request.get(inbox + '/api/v1/message/' + message.ID);
  return ((await body.json()).Text ?? '').match(/(?<!\d)\d{6}(?!\d)/)?.[0] ?? null;
}

test('verified passkey signs straight in even if the account uses TOTP', async ({
  page,
  context,
  request,
  browserName,
}, info) => {
  test.skip(browserName !== 'chromium', 'Virtual WebAuthn authenticator uses CDP');
  const providers = await (await request.get(api + '/providers')).json();
  test.skip(!providers.passkey, 'Set the local passkey RP and origin to run the ceremony');
  await page.setViewportSize({ width: 390, height: 844 });
  const email = randomUUID() + '@example.test';
  const password = randomUUID();
  const post = (path: string, data: object, target = context.request) =>
    target.post(api + path, { headers, data });
  const session = async () => (await context.request.get(api + '/get-session', { headers })).json();
  expect(
    (await createLegacyAccount(context.request, { email, password, name: 'Minh An' })).ok(),
  ).toBe(true);
  expect(
    (await post('/email-otp/send-verification-otp', { email, type: 'email-verification' })).ok(),
  ).toBe(true);
  let otp: string | null = null;
  await expect.poll(async () => (otp = await mailCode(request, email))).toMatch(/^\d{6}$/);
  expect((await post('/email-otp/verify-email', { email, otp })).ok()).toBe(true);
  const enrollment = await post('/two-factor/enable', { password });
  expect(enrollment.ok()).toBe(true);
  expect(
    (
      await post('/two-factor/verify-totp', {
        code: authenticatorCode((await enrollment.json()).totpURI),
      })
    ).ok(),
  ).toBe(true);
  expect((await session()).user.twoFactorEnabled).toBe(true);

  await page.goto('/profile/personal');
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.getByRole('button', { name: 'Tạo passkey', exact: true }).click();
  await expect(page.getByText('Đã tạo passkey.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gỡ passkey' })).toBeVisible();

  expect((await post('/sign-out', {})).ok()).toBe(true);
  await page.goto('/profile/personal');
  await expect(page).toHaveURL(/\/auth\?returnTo=/);
  const usePasskey = page.getByRole('button', { name: 'Đăng nhập bằng passkey', exact: true });
  await expect(usePasskey).toBeVisible();
  await page.screenshot({ path: info.outputPath('passkey-sign-in.png') });

  // Use the private key of the disposable virtual fixture to sign a valid
  // assertion without UV. A real registration/login still goes via the UI.
  const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
  const [fixture] = credentials;
  expect(fixture).toBeDefined();
  const options = await (
    await context.request.get(api + '/passkey/generate-authenticate-options', { headers })
  ).json();
  expect(options.userVerification).toBe('required');
  const privateKey = createPrivateKey({
    key: Buffer.from(fixture!.privateKey, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  const credentialId = Buffer.from(fixture!.credentialId, 'base64').toString('base64url');
  function signedAssertion(challenge: string, userVerified: boolean) {
    const authData = Buffer.alloc(37);
    createHash('sha256').update('localhost').digest().copy(authData);
    authData[32] = userVerified ? 5 : 1; // UP always; UV only in the affirmative fixture.
    authData.writeUInt32BE(fixture!.signCount + 1, 33);
    const clientData = Buffer.from(
      JSON.stringify({
        type: 'webauthn.get',
        challenge,
        origin: 'http://localhost:8081',
        crossOrigin: false,
      }),
    );
    const signature = sign(
      privateKey.asymmetricKeyType === 'ed25519' ? null : 'sha256',
      Buffer.concat([authData, createHash('sha256').update(clientData).digest()]),
      privateKey,
    );
    return {
      id: credentialId,
      rawId: credentialId,
      type: 'public-key',
      response: {
        authenticatorData: authData.toString('base64url'),
        clientDataJSON: clientData.toString('base64url'),
        signature: signature.toString('base64url'),
      },
      clientExtensionResults: {},
    };
  }
  const unverifiedAssertion = signedAssertion(options.challenge, false);
  const denied = await post('/passkey/verify-authentication', { response: unverifiedAssertion });
  expect(denied.status()).toBe(401);
  expect((await denied.json()).code).toBe('PASSKEY_USER_VERIFICATION_REQUIRED');
  expect(await session()).toBeNull();

  // Our headless browser cannot show the discoverable-credential picker.
  // Substitute the virtual fixture response only at the OS interface;
  // the real client, signed challenge, API verification and session run as-is.
  await page.exposeFunction('signedPasskeyTestAssertion', (challenge: string, mode: string) => {
    expect(mode).toBe('required');
    return signedAssertion(challenge, true);
  });
  await page.evaluate(() => {
    const decode = (input: string) =>
      Uint8Array.from(atob(input.replace(/-/g, '+').replace(/_/g, '/')), (char) =>
        char.charCodeAt(0),
      );
    navigator.credentials.get = async (parameters) => {
      const { publicKey } = parameters ?? {};
      if (!publicKey) return null;
      const challenge = btoa(
        String.fromCharCode(...new Uint8Array(publicKey.challenge as ArrayBuffer)),
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const testDevice = window as unknown as {
        signedPasskeyTestAssertion: (
          challenge: string,
          mode?: string,
        ) => Promise<{
          id: string;
          rawId: string;
          type: string;
          response: Record<string, string>;
        }>;
      };
      const { id, rawId, type, response } = await testDevice.signedPasskeyTestAssertion(
        challenge,
        publicKey.userVerification,
      );
      return {
        id,
        type,
        rawId: decode(rawId).buffer,
        response: {
          authenticatorData: decode(response.authenticatorData!).buffer,
          clientDataJSON: decode(response.clientDataJSON!).buffer,
          signature: decode(response.signature!).buffer,
          userHandle: null,
        },
        authenticatorAttachment: 'platform',
        getClientExtensionResults: () => ({}),
      } as unknown as PublicKeyCredential;
    };
  });
  await usePasskey.click();
  await expect(page).toHaveURL(/\/profile\/personal$/);
  await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();
  expect((await session()).user.twoFactorEnabled).toBe(true);
  expect((await session()).user.email).toBe(email);
  await expect(page.getByRole('heading', { name: 'Xác thực hai bước' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Gỡ passkey' }).click();
  const removal = page.getByRole('dialog');
  await removal.getByRole('button', { name: 'Gỡ passkey' }).click();
  await expect(page.getByText('Đã gỡ passkey.', { exact: true })).toBeVisible();
});
