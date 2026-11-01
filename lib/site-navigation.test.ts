import { describe, expect, it } from "vitest";
import { defaultHeaderMenuItems, headerMenuSchema } from "./site-navigation";

describe("header menu schema", () => {
  it("accepts the default navigation", () => {
    expect(headerMenuSchema.safeParse(defaultHeaderMenuItems).success).toBe(true);
  });

  it("rejects unsafe links and duplicate IDs", () => {
    const duplicate = { ...defaultHeaderMenuItems[0], href: "javascript:alert(1)" };
    expect(headerMenuSchema.safeParse([duplicate, duplicate]).success).toBe(false);
  });
});
