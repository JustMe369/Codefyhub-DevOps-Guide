import { describe, expect, it } from "vitest";
import { editorialIssues } from "./editorial";

const article = { body: "## Procedure\n\nPerform the reviewed action.\n\n## Validation\n\nCheck the expected outcome.", contentType: "WORKFLOW", validationStatus: "SOURCE_REVIEWED", applicablePlatforms: ["Linux"], applicableVersions: ["24.04"], prerequisites: ["Approved access"], testedAt: null, testEnvironment: null, verifiedBy: "Operations", verificationMethod: "Compared against official documentation", testedVersions: "Ubuntu 24.04", lastVerifiedAt: new Date("2026-01-01") };

describe("editorial approval gate", () => {
  it("accepts reviewed operational evidence", () => { expect(editorialIssues(article)).toEqual([]); });
  it("blocks unreviewed content and unsupported lab claims", () => {
    expect(editorialIssues({ ...article, validationStatus: "DRAFT", testedAt: new Date("2026-01-01") })).toHaveLength(2);
  });
  it("blocks operational content without applicability or validation", () => {
    expect(editorialIssues({ ...article, applicablePlatforms: [], prerequisites: [], body: "## Procedure\n\nDo something." })).toHaveLength(3);
  });
});
