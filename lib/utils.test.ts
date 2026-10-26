import { describe, expect, it } from "vitest";
import { stripMarkdown } from "./utils";

describe("stripMarkdown", () => {
  it("returns a compact search excerpt", () => {
    expect(stripMarkdown("## Storage\n\nUse **RAID** with `care`."))
      .toBe("Storage Use RAID with care.");
  });

  it("removes fenced command blocks", () => {
    expect(stripMarkdown("Before\n```bash\nrm -rf example\n```\nAfter"))
      .toBe("Before After");
  });
});
