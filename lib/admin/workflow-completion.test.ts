import { describe, expect, it } from "vitest";
import { completeWorkflowDraft, workflowCompletionIssues, type WorkflowDraft } from "./workflow-completion";

const incomplete: WorkflowDraft = {
  id: "cmvxkdsmw000008l2j8ioq86l",
  slug: "INVALID SLUG",
  title: "VPN",
  description: "Short",
  body: "# WireGuard VPN deployment\n\nDeploy to Windows 11, macOS 15, Ubuntu 24.04, iOS, and Android.",
  applicablePlatforms: [],
  applicableVersions: [],
  prerequisites: [],
  readingMinutes: 0,
  order: 0,
  lastVerifiedAt: "invalid",
  verifiedBy: "",
  verificationMethod: "",
  testedVersions: "",
};

describe("workflow completion assistant", () => {
  it("reports incomplete required metadata", () => {
    expect(workflowCompletionIssues(incomplete).length).toBeGreaterThan(5);
  });

  it("fills safe workflow metadata without claiming review or testing", () => {
    const result = completeWorkflowDraft(incomplete, new Date("2026-11-01T12:00:00Z"));
    expect(workflowCompletionIssues(result.article)).toEqual([]);
    expect(result.article.applicablePlatforms).toEqual(expect.arrayContaining(["Windows", "macOS", "Ubuntu", "iOS", "Android"]));
    expect(result.article.testedVersions).toBe("Not yet validated");
    expect(result.article.verificationMethod).toContain("still required");
    expect(result.completed).toContain("prerequisites");
  });
});
