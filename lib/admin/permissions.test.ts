import { describe, expect, it } from "vitest";
import { permissionKeys, systemRoleTemplates } from "./permissions";

describe("company permission templates", () => {
  it("grants every permission to the protected owner role", () => {
    const owner = systemRoleTemplates.find((role) => role.slug === "company-owner");
    expect(owner?.permissions).toEqual(permissionKeys);
  });

  it("keeps company ownership outside the knowledge admin role", () => {
    const admin = systemRoleTemplates.find((role) => role.slug === "knowledge-admin");
    expect(admin?.permissions).not.toContain("company.manage");
    expect(admin?.permissions).toContain("members.manage");
    expect(admin?.permissions).toContain("content.publish");
  });

  it("keeps viewers read-only", () => {
    const viewer = systemRoleTemplates.find((role) => role.slug === "viewer");
    expect(viewer?.permissions).toEqual(["content.view", "ai.use"]);
  });
});
