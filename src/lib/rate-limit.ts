import { NextRequest } from 'next/server';

type WindowEntry = { count: number; expiresAt: number };

const globalStore = globalThis as typeof globalThis & {
  milevoRateLimits?: Map<string, WindowEntry>;
};
const entries = globalStore.milevoRateLimits ??= new Map<string, WindowEntry>();

export function checkRateLimit(
  request: NextRequest,
  name: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const ip = request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const key = `${name}:${ip}`;
  const current = entries.get(key);

  if (!current || current.expiresAt <= now) {
    if (entries.size >= 10_000) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey) entries.delete(oldestKey);
    }
    entries.set(key, { count: 1, expiresAt: now + windowMs });
    if (entries.size > 10_000) {
      for (const [entryKey, entry] of entries) {
        if (entry.expiresAt <= now) entries.delete(entryKey);
      }
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
