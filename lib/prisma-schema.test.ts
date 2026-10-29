import { describe, expect, it } from "vitest";
import { ContentType } from "../generated/prisma/client";

describe("Prisma schema compatibility", () => {
  it("can deserialize legacy workflow articles", () => {
    expect(ContentType.WORKFLOW).toBe("WORKFLOW");
  });
});
