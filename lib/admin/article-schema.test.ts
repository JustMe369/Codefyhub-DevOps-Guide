import { describe, expect, it } from "vitest";
import { createArticleSchema, updateArticleSchema } from "./article-schema";

const validArticle = {
  sectionId: "cm00000000000000000000000",
  slug: "safe-linux-operations",
  title: "Safe Linux operations",
  description: "A production-oriented guide to changing Linux systems with validation and recovery.",
  body: "# Objective\n\nThis body is intentionally long enough to satisfy the editorial API boundary.\n\n## Validation\n\nVerify the observable outcome before continuing.",
  difficulty: "INTERMEDIATE" as const,
  contentType: "HOW_TO" as const,
  validationStatus: "SOURCE_REVIEWED" as const,
  applicablePlatforms: ["Ubuntu"],
  applicableVersions: ["24.04 LTS"],
  prerequisites: ["start-here/learning-path-lab"],
  relatedGuides: ["production/readiness"],
  readingMinutes: 12,
  lastVerifiedAt: "2026-10-27T00:00:00.000Z",
  verifiedBy: "Codefyhub Editorial Team",
  verificationMethod: "First-party documentation review",
  testedVersions: "Ubuntu 24.04 LTS",
  testedAt: null,
  testEnvironment: null,
  changeSummary: "Create the reviewed draft",
};

describe("admin article schemas", () => {
  it("accepts a bounded reviewed draft", () => {
    const parsed = createArticleSchema.safeParse(validArticle);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.visibility).toBe("INTERNAL");
      expect(parsed.data.reviewDueAt).toBeNull();
      expect(parsed.data.expiresAt).toBeNull();
    }
  });

  it("rejects unsafe slugs and empty change summaries", () => {
    const result = createArticleSchema.safeParse({ ...validArticle, slug: "Unsafe Slug", changeSummary: "" });
    expect(result.success).toBe(false);
  });

  it("requires an optimistic concurrency timestamp and at least one changed field", () => {
    const empty = updateArticleSchema.safeParse({ expectedUpdatedAt: new Date(), changeSummary: "Save", data: {} });
    const update = updateArticleSchema.safeParse({ expectedUpdatedAt: new Date(), changeSummary: "Save", data: { title: "Updated safe Linux operations" } });
    expect(empty.success).toBe(false);
    expect(update.success).toBe(true);
  });
});
