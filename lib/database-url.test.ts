import { describe, expect, it } from "vitest";
import { normalizePostgresConnectionString } from "./database-url";

describe("normalizePostgresConnectionString", () => {
  it.each(["prefer", "require", "verify-ca"])("makes %s certificate verification explicit", (mode) => {
    const normalized = normalizePostgresConnectionString(`postgresql://user:pass@db.example.com/app?sslmode=${mode}`);
    expect(new URL(normalized).searchParams.get("sslmode")).toBe("verify-full");
  });

  it("preserves explicit libpq compatibility semantics", () => {
    const normalized = normalizePostgresConnectionString("postgresql://user:pass@db.example.com/app?sslmode=require&uselibpqcompat=true");
    expect(new URL(normalized).searchParams.get("sslmode")).toBe("require");
  });

  it("leaves unrelated connection options intact", () => {
    const normalized = new URL(normalizePostgresConnectionString("postgresql://user:pass@db.example.com/app?sslmode=verify-full&connect_timeout=10"));
    expect(normalized.searchParams.get("sslmode")).toBe("verify-full");
    expect(normalized.searchParams.get("connect_timeout")).toBe("10");
  });
});
