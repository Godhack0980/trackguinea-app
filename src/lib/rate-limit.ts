import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean expired records every 5 minutes to prevent memory leak
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit?: number; // max requests
  windowMs?: number; // timeframe in milliseconds
}

/**
 * Server-side Sliding-Window Rate Limiter
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { isAllowed: boolean; limit: number; remaining: number; resetTime: number } {
  const limit = options.limit || 30; // default 30 requests
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const now = Date.now();

  const key = `ratelimit:${identifier}`;
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    return { isAllowed: true, limit, remaining: limit - 1, resetTime };
  }

  record.count += 1;
  memoryStore.set(key, record);

  const remaining = Math.max(0, limit - record.count);
  const isAllowed = record.count <= limit;

  return { isAllowed, limit, remaining, resetTime: record.resetTime };
}

/**
 * Middleware helper for Next.js Route Handlers
 */
export function applyRateLimit(
  req: Request,
  actionKey: string = 'api',
  options: RateLimitOptions = {}
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'anonymous';
  
  const identifier = `${actionKey}:${ip}`;
  const { isAllowed, limit, remaining, resetTime } = checkRateLimit(identifier, options);

  if (!isAllowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Trop de requêtes. Veuillez patienter avant d'essayer à nouveau.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(resetTime),
        }
      }
    );
  }

  return null;
}
