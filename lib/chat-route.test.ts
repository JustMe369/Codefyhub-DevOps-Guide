import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ metric: vi.fn(async () => 1), ping: vi.fn(async () => "PONG"), quota: vi.fn(async () => 1) }));
vi.mock("@upstash/redis", () => ({ Redis: class { incrby = mocks.metric; ping = mocks.ping; eval = mocks.quota; } }));
vi.mock("@/lib/admin/authz", () => ({ getAdminIdentity: async () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: { glossaryTerm: { findMany: async () => [] }, article: { findMany: async () => [] } } }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("OPENROUTER_API_KEY", "test-only-provider-key");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.invalid");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-only-redis-token");
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("chat HTTP route", () => {
  it("returns consumable SSE and records usage only after completion", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/embeddings")) return Response.json({}, { status: 400 });
      return new Response('data: {"choices":[{"delta":{"content":"Verified response"}}]}\n\ndata: {"usage":{"prompt_tokens":20,"completion_tokens":5}}\n\ndata: [DONE]\n\n');
    }));
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", headers: { "Content-Type": "application/json", origin: "https://example.com" }, body: JSON.stringify({ messages: [{ role: "user", content: "Explain storage" }], stream: true }) }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mocks.metric.mock.calls.some(([key]) => key === "aim:successful_requests")).toBe(false);
    expect(await response.text()).toContain("Verified response");
    expect(mocks.metric).toHaveBeenCalledWith("aim:successful_requests", 1);
    expect(mocks.metric).toHaveBeenCalledWith("aim:total_tokens_in", 20);
    expect(mocks.metric).toHaveBeenCalledWith("aim:total_tokens_out", 5);
  });
  it("returns service-unavailable when production quota infrastructure is absent", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
  });
});

describe("AI readiness", () => {
  it("requires production rate-limit configuration as well as the provider", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", ""); vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { GET } = await import("../app/api/chat/health/route");
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).configured).toBe(false);
  });
  it("reports a failed Redis ping as unavailable", async () => {
    mocks.ping.mockRejectedValueOnce(new Error("unavailable"));
    const { GET } = await import("../app/api/chat/health/route");
    expect((await GET()).status).toBe(503);
  });
});
