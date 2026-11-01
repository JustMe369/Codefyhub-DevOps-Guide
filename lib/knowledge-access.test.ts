import { describe, expect, it } from "vitest";
import { canReadEditorialKnowledge, editorialArticleWhere, readerArticleWhere } from "./knowledge-access";

const viewer = { companyId: "company-a", isPlatformAdmin: false, permissions: ["content.view", "ai.use"] };

describe("knowledge read boundaries", () => {
  it("uses the complete publication policy for a reader on editorial endpoints", () => {
    const policy = editorialArticleWhere(viewer);
    expect(policy).toMatchObject({ companyId: "company-a", company: { status: "ACTIVE" }, status: "PUBLISHED", reviewStatus: "APPROVED", section: { status: "PUBLISHED" }, visibility: { in: ["PUBLIC", "INTERNAL"] } });
    expect(policy.OR).toHaveLength(2);
    expect(canReadEditorialKnowledge(viewer)).toBe(false);
  });
  it("allows editorial drafts only within the selected company", () => {
    const editor = { ...viewer, permissions: ["content.view", "content.edit"] };
    expect(editorialArticleWhere(editor)).toEqual({ companyId: "company-a" });
    expect(readerArticleWhere(editor)).toMatchObject({ status: "PUBLISHED", visibility: { in: ["PUBLIC", "INTERNAL", "RESTRICTED"] } });
  });
});
