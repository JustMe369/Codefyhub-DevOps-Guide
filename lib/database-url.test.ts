import { describe, expect, it } from "vitest";
import { normalizePostgresConnectionString } from "./database-url";

function testConnectionString(query: string) {
  const url = new URL("postgresql://db.example.com/app");
  url.username = "user";
  url.password = "pass";
  url.search = query;
  return url.toString();
}

describe("normalizePostgresConnectionString", () => {
  it.each(["prefer", "require", "verify-ca"])("makes %s certificate verification explicit", (mode) => {
    const normalized = normalizePostgresConnectionString(testConnectionString(`sslmode=${mode}`));
    expect(new URL(normalized).searchParams.get("sslmode")).toBe("verify-full");
  });

  it("preserves explicit libpq compatibility semantics", () => {
    const normalized = normalizePostgresConnectionString(testConnectionString("sslmode=require&uselibpqcompat=true"));
    expect(new URL(normalized).searchParams.get("sslmode")).toBe("require");
  });

  it("leaves unrelated connection options intact", () => {
    const normalized = new URL(normalizePostgresConnectionString(testConnectionString("sslmode=verify-full&connect_timeout=10")));
    expect(normalized.searchParams.get("sslmode")).toBe("verify-full");
    expect(normalized.searchParams.get("connect_timeout")).toBe("10");
  });
});
