import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

type Result = { ok: boolean; retryAfterMs: number; unavailable?: boolean };
const store = new Map<string, { count: number; expiresAt: number }>();
const MAX_KEYS = 10_000;
let requests = 0;

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Result> {
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const now = Date.now();
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    if (redisUrl && redisToken) {
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const [count, ttl] = await redis.eval<[number], [number, number]>(`
        local n = redis.call('INCR', KEYS[1]);
        if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end;
        return {n, redis.call('PTTL', KEYS[1])};
      `, [`admin:rl:${hashedKey}`], [windowMs]);
      return { ok: count <= limit, retryAfterMs: count <= limit ? 0 : Math.max(ttl, 1) };
    }
    if (process.env.NODE_ENV === "production") {
      // Postgres provides a shared atomic fallback without requiring another
      // production service. The table is created by the audit-hardening migration.
      const { prisma } = await import("@/lib/prisma");
      const [row] = await prisma.$queryRaw<Array<{ count: number; retryAfterMs: number }>>`
        INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
        VALUES (${hashedKey}, 1, CURRENT_TIMESTAMP + ${windowMs} * INTERVAL '1 millisecond')
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
          "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${windowMs} * INTERVAL '1 millisecond' ELSE "RateLimitBucket"."expiresAt" END
        RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - CURRENT_TIMESTAMP)) * 1000))::int AS "retryAfterMs"
      `;
      if (++requests % 128 === 0) await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "expiresAt" < CURRENT_TIMESTAMP`;
      return { ok: row.count <= limit, retryAfterMs: row.count <= limit ? 0 : row.retryAfterMs };
    }
  } catch {
    return { ok: false, retryAfterMs: windowMs, unavailable: true };
  }
  // Only development and tests use a bounded process-local fallback.
  for (const [storedKey, value] of store) if (value.expiresAt <= now) store.delete(storedKey);
  let entry = store.get(hashedKey);
  if (!entry) {
    if (store.size >= MAX_KEYS) return { ok: false, retryAfterMs: windowMs, unavailable: true };
    entry = { count: 0, expiresAt: now + windowMs };
    store.set(hashedKey, entry);
  }
  entry.count += 1;
  return { ok: entry.count <= limit, retryAfterMs: entry.count <= limit ? 0 : entry.expiresAt - now };
}

export function cleanupRateLimitStore() { store.clear(); }

export function clientRateLimitKey(request: Request) {
  // Vercel overwrites x-real-ip. Forwarded headers are accepted only locally.
  const ip = request.headers.get("x-real-ip")?.trim()
    || (process.env.NODE_ENV !== "production" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : undefined)
    || "unknown";
  return ip;
}
