import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { z } from 'zod';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { fromNodeHeaders } from 'better-auth/node';
import { expo } from '@better-auth/expo';
import type { Request } from 'express';
import { db } from '../infrastructure/db.js';
import { env } from '../config/env.js';
import { logger } from '../common/http.js';
import { emailService } from '../infrastructure/email.js';
import { createOtpCooldown } from './otp-policy.js';

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        mapProfileToUser: (profile: { email_verified?: boolean }) =>
          profile.email_verified === true ? {} : { email: undefined },
      }
    : undefined;
const apple =
  env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET && env.APPLE_APP_BUNDLE_IDENTIFIER
    ? {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: env.APPLE_CLIENT_SECRET,
        appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
        mapProfileToUser: (profile: { email_verified?: boolean | string }) =>
          profile.email_verified === true || profile.email_verified === 'true'
            ? {}
            : { email: undefined },
      }
    : undefined;
export const authProviders = { emailOtp: true, google: Boolean(google) };
export const isApplePrepared = Boolean(apple);
const acquireOtpCooldown = createOtpCooldown();
const emailInput = z.email();

function allowedNativeOAuthTarget(value: unknown) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      ((!!google &&
        url.origin === 'https://accounts.google.com' &&
        url.pathname === '/o/oauth2/v2/auth') ||
        (!!apple &&
          url.origin === 'https://appleid.apple.com' &&
          url.pathname === '/auth/authorize'))
    );
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  appName: 'Finora',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  trustedOrigins: [
    ...env.WEB_ORIGINS,
    'finora://',
    ...(apple ? ['https://appleid.apple.com'] : []),
  ],
  socialProviders: { ...(google && { google }), ...(apple && { apple }) },
  plugins: [
    expo(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      storeOTP: 'encrypted',
      resendStrategy: 'rotate',
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== 'sign-in' && type !== 'email-verification') {
          throw new APIError('BAD_REQUEST', { code: 'AUTH_OTP_UNSUPPORTED' });
        }
        try {
          await emailService.sendOtp(email, otp, type);
        } catch {
          logger.warn('Verification email delivery failed');
          throw new APIError('SERVICE_UNAVAILABLE', { code: 'AUTH_OTP_UNAVAILABLE' });
        }
      },
    }),
  ],
  // The UI supports sign-in and an authenticated proof for unverified legacy accounts.
  // Do not turn on implicit verification, email-change or password-reset actions.
  disabledPaths: [
    '/email-otp/check-verification-otp',
    '/email-otp/request-password-reset',
    '/email-otp/reset-password',
    '/forget-password/email-otp',
    '/email-otp/request-email-change',
    '/email-otp/change-email',
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path === '/expo-authorization-proxy' &&
        !allowedNativeOAuthTarget(ctx.query?.authorizationURL)
      ) {
        throw new APIError('BAD_REQUEST', { code: 'AUTH_OAUTH_TARGET_INVALID' });
      }
      if (ctx.path === '/link-social') {
        const session = await getSessionFromCtx(ctx);
        if (!session?.user.emailVerified) {
          throw new APIError('FORBIDDEN', { code: 'AUTH_VERIFY_EMAIL_BEFORE_LINKING' });
        }
      }
      const isSend = ctx.path === '/email-otp/send-verification-otp';
      const isVerifyEmail = ctx.path === '/email-otp/verify-email';
      const isSignIn = ctx.path === '/sign-in/email-otp';
      if (!isSend && !isVerifyEmail && !isSignIn) return;
      const email = String(ctx.body?.email ?? '')
        .trim()
        .toLowerCase();
      if (!emailInput.safeParse(email).success)
        throw new APIError('BAD_REQUEST', { code: 'INVALID_EMAIL' });
      if (isSend && ctx.body?.type !== 'sign-in' && ctx.body?.type !== 'email-verification')
        throw new APIError('BAD_REQUEST', { code: 'AUTH_OTP_UNSUPPORTED' });
      if (isVerifyEmail || (isSend && ctx.body?.type === 'email-verification')) {
        const session = await getSessionFromCtx(ctx);
        if (!session || session.user.email.toLowerCase() !== email)
          throw new APIError('FORBIDDEN', { code: 'AUTH_EMAIL_VERIFICATION_SESSION_REQUIRED' });
      }
      if (isSend && !acquireOtpCooldown(email))
        throw new APIError('TOO_MANY_REQUESTS', {
          code: 'AUTH_OTP_COOLDOWN',
          message: 'Wait before requesting another verification code.',
        });
      const otp = ctx.body?.otp;
      if ((isVerifyEmail || isSignIn) && (typeof otp !== 'string' || !/^\d{6}$/.test(otp)))
        throw new APIError('BAD_REQUEST', { code: 'INVALID_OTP' });
      return { context: { body: { ...ctx.body, email } } };
    }),
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
    },
  },
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 300,
    customRules: {
      '/get-session': false,
      '/email-otp/send-verification-otp': { window: 300, max: 12 },
      '/sign-in/email-otp': { window: 60, max: 16 },
      '/email-otp/verify-email': { window: 60, max: 16 },
    },
  },
  advanced: {
    // This header is always overwritten by the Express adapter, never accepted
    // from the request. Finora is not configured to trust arbitrary proxies.
    ipAddress: { ipAddressHeaders: ['x-finora-client-ip'] },
    cookiePrefix: 'finora',
    defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
  },
});
export interface OwnedRequest extends Request {
  userId: string;
}
@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<OwnedRequest>();
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new UnauthorizedException();
    req.userId = session.user.id;
    return true;
  }
}
