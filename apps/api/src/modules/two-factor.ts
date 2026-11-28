import { createAuthEndpoint } from 'better-auth/api';
import { expireCookie } from 'better-auth/cookies';
import { twoFactor } from 'better-auth/plugins';

const challengeCookie = 'two_factor';

export function isFactorSignInPath(path?: string) {
  return (
    path === '/sign-in/email' ||
    path === '/sign-in/email-otp' ||
    path === '/sign-in/social' ||
    path === '/callback/:id'
  );
}

export function finoraTwoFactor() {
  const plugin = twoFactor({
    issuer: 'FINORA',
    twoFactorCookieMaxAge: 300,
    allowPasswordless: true,
  });
  return {
    ...plugin,
    endpoints: {
      ...plugin.endpoints,
      factorStatus: createAuthEndpoint('/two-factor/status', { method: 'GET' }, async (ctx) => {
        const cookie = ctx.context.createAuthCookie(challengeCookie);
        const id = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
        const pending = id ? await ctx.context.internalAdapter.findVerificationValue(id) : null;
        return ctx.json({ required: !!pending && pending.expiresAt.getTime() > Date.now() });
      }),
      cancelFactor: createAuthEndpoint('/two-factor/cancel', { method: 'POST' }, async (ctx) => {
        const cookie = ctx.context.createAuthCookie(challengeCookie);
        const id = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
        if (id) {
          await ctx.context.internalAdapter.consumeVerificationValue(id);
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(`2fa-attempts-${id}`);
        }
        expireCookie(ctx, cookie);
        return ctx.json({ ok: true });
      }),
    },
    hooks: {
      // Use Better Auth's built-in cookie scrubbing, session deletion, one-time
      // challenge and attempt tracking for every supported first-factor route.
      // Pinned to Better Auth 1.6.35; the OAuth adapter contract is covered by tests.
      after: plugin.hooks.after.map((hook) => ({
        matcher(context: Parameters<typeof hook.matcher>[0]) {
          return hook.matcher(context) || isFactorSignInPath(context.path);
        },
        handler: Object.assign(
          async (ctx: Parameters<typeof hook.handler>[0] & { path?: string }) => {
            const result = await hook.handler(ctx);
            if (ctx.path !== '/callback/:id') return result;
            // Preserve the original OAuth 302 and Location. The Expo plugin,
            // ordered after this plugin, forwards only the scrubbed cookies.
            return { ...result, response: undefined };
          },
          { options: hook.handler.options },
        ),
      })),
    },
  };
}
