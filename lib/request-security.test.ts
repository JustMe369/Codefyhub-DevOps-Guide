import { describe, expect, it } from "vitest";
import { isTrustedMutationOrigin } from "./request-security";

describe("mutation origin protection", () => {
  it("accepts the request's own origin", () => {
    const request = new Request("https://kb.example.com/api/admin/articles", { method: "POST", headers: { origin: "https://kb.example.com" } });
    expect(isTrustedMutationOrigin(request)).toBe(true);
  });

  it("rejects missing and cross-site origins", () => {
    expect(isTrustedMutationOrigin(new Request("https://kb.example.com/api/admin/articles", { method: "POST" }))).toBe(false);
    expect(isTrustedMutationOrigin(new Request("https://kb.example.com/api/admin/articles", { method: "POST", headers: { origin: "https://attacker.example" } }))).toBe(false);
  });
});
