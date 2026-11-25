import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { fromNodeHeaders } from 'better-auth/node';
import { expo } from '@better-auth/expo';
import type { Request } from 'express';
import { db } from '../infrastructure/db.js';
import { env } from '../config/env.js';

export const auth = betterAuth({
  appName: 'Finora',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  trustedOrigins: [...env.WEB_ORIGINS, 'finora://'],
  plugins: [expo()],
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 300,
    customRules: { '/get-session': false },
  },
  advanced: {
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
