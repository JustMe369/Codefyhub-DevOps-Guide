import { describe, expect, it } from "vitest";
import { formatUtcDate, formatUtcDateTime } from "./date-format";

describe("deterministic date formatting", () => {
  it("formats calendar dates in UTC", () => {
    expect(formatUtcDate("2026-11-01T23:55:00.000Z")).toBe("Nov 1, 2026");
  });

  it("formats date-times without depending on the host timezone", () => {
    expect(formatUtcDateTime("2026-11-01T07:55:59.000Z")).toBe("Nov 1, 2026 at 07:55 UTC");
  });
});
