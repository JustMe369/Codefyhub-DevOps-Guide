import { afterEach, expect, it, vi } from "vitest";
import { publicCompanyWhere } from "./public-company";

afterEach(() => vi.unstubAllEnvs());
it("binds existing public URLs to the default company", () => {
  vi.stubEnv("PUBLIC_COMPANY_ID", "");
  expect(publicCompanyWhere()).toEqual({ id: "codefyhub-company", isPublic: true, status: "ACTIVE" });
});
it("supports one explicitly configured public company", () => {
  vi.stubEnv("PUBLIC_COMPANY_ID", "other-company");
  expect(publicCompanyWhere().id).toBe("other-company");
});
