import { passkey } from '@better-auth/passkey';
import { APIError, createAuthMiddleware } from 'better-auth/api';

export function finoraPasskey(rpID: string, origins: string[]) {
  const requireVerification = (verified: boolean | undefined) => {
    if (verified !== true)
      throw new APIError('UNAUTHORIZED', { code: 'PASSKEY_USER_VERIFICATION_REQUIRED' });
  };
  const plugin = passkey({
    rpID,
    rpName: 'FINORA',
    origin: origins,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
    advanced: { webAuthnChallengeCookie: 'passkey_challenge' },
    registration: {
      requireSession: true,
      afterVerification: async ({ verification }) => {
        requireVerification(verification.registrationInfo?.userVerified);
      },
    },
    authentication: {
      // Better Auth 1.6.35 verifies the signature but defaults UV to optional.
      // Its verification hook sees the authenticated data before a session exists.
      afterVerification: async ({ verification }) => {
        requireVerification(verification.authenticationInfo?.userVerified);
      },
    },
  });
  return {
    ...plugin,
    hooks: {
      after: [
        {
          matcher: (ctx: { path?: string }) =>
            ctx.path === '/passkey/generate-authenticate-options',
          handler: createAuthMiddleware(async (ctx) => {
            const value: unknown = ctx.context.returned;
            if (value && typeof value === 'object' && 'challenge' in value) {
              return ctx.json({ ...value, userVerification: 'required' });
            }
          }),
        },
      ],
    },
  };
}
