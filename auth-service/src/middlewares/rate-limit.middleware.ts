import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

function getClientKey(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  return (forwardedIp ?? req.ip ?? req.socket.remoteAddress ?? 'unknown').trim();
}

export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  if (!env.authRateLimitEnabled) {
    next();
    return;
  }

  const now = Date.now();
  const key = `${req.path}:${getClientKey(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + env.authRateLimitWindowMs,
    });
    next();
    return;
  }

  bucket.count += 1;

  if (bucket.count > env.authRateLimitMax) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Try again later.',
      error: {
        code: 'RATE_LIMITED',
        details: null,
      },
    });
    return;
  }

  next();
}
