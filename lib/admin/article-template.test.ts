import { describe, expect, it } from "vitest";
import { knowledgeTemplateBodies, knowledgeTemplateSchema } from "./article-template";

const validRequest = {
  sectionId: "cm12345678901234567890123",
  title: "Deploy the company VPN",
  description: "Follow the approved process to deploy and validate the company VPN.",
  visibility: "INTERNAL" as const,
};

describe("knowledge article templates", () => {
  it.each(["WORKFLOW", "FAQ", "ISSUE_SOLUTION", "POLICY"] as const)("accepts the %s type offered by the creation form", (contentType) => {
    expect(knowledgeTemplateSchema.safeParse({ ...validRequest, contentType }).success).toBe(true);
    expect(knowledgeTemplateBodies[contentType].length).toBeGreaterThanOrEqual(80);
  });
});
