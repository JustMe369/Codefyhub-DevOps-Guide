import { createHash } from "node:crypto";

const store = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (store.get(hashedKey) ?? []).filter((timestamp) => timestamp > cutoff);

  if (timestamps.length >= limit) {
    const oldest = Math.min(...timestamps);
    return { ok: false, retryAfterMs: oldest + windowMs - now };
  }

  timestamps.push(now);
  store.set(hashedKey, timestamps);
  return { ok: true, retryAfterMs: 0 };
}

export function cleanupRateLimitStore(): void {
  store.clear();
}
