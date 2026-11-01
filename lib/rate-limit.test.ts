import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupRateLimitStore, rateLimit, clientRateLimitKey } from "./rate-limit";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); cleanupRateLimitStore(); });

describe("request quotas", () => {
  it("rejects bursts and permits requests after expiry", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.useFakeTimers();
    expect((await rateLimit("client", 1, 1000)).ok).toBe(true);
    expect(await rateLimit("client", 1, 1000)).toMatchObject({ ok: false, retryAfterMs: 1000 });
    vi.advanceTimersByTime(1001);
    expect((await rateLimit("client", 1, 1000)).ok).toBe(true);
  });
  it("does not trust client-supplied forwarded addresses in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(clientRateLimitKey(new Request("https://example.com", { headers: { "x-forwarded-for": "spoofed" } }))).toBe("unknown");
  });
});
