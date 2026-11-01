import { describe, expect, it } from "vitest";
import { decideSourceSync } from "./source-sync";

describe("decideSourceSync", () => {
  it("never overwrites admin-authored content with a source collision", () => {
    expect(decideSourceSync({ origin: "ADMIN", syncStatus: "NOT_APPLICABLE", contentChanged: true, previousSourceHash: null, nextSourceHash: "source" })).toBe("PRESERVE_ADMIN");
  });

  it("adopts an unchanged legacy source row after the ownership migration", () => {
    expect(decideSourceSync({ origin: "ADMIN", syncStatus: "NOT_APPLICABLE", contentChanged: false, previousSourceHash: null, nextSourceHash: "source" })).toBe("ADOPT");
  });

  it("preserves a Studio edit and flags an upstream source change", () => {
    expect(decideSourceSync({ origin: "SOURCE", syncStatus: "MODIFIED", contentChanged: true, previousSourceHash: "old", nextSourceHash: "new" })).toBe("MARK_CONFLICT");
  });

  it("keeps a modified Studio revision when the repository source is unchanged", () => {
    expect(decideSourceSync({ origin: "SOURCE", syncStatus: "MODIFIED", contentChanged: true, previousSourceHash: "same", nextSourceHash: "same" })).toBe("PRESERVE_MODIFIED");
  });
});
