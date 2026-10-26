import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { readStored, stringListSchema } from "./client-storage";

describe("browser storage validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns validated stored data", () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(["article-1"]) });
    expect(readStored("key", stringListSchema, [])).toEqual(["article-1"]);
  });

  it("rejects malformed and incorrectly shaped data", () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ completed: true }) });
    expect(readStored("key", z.array(z.string()), [])).toEqual([]);
    vi.stubGlobal("localStorage", { getItem: () => "{" });
    expect(readStored("key", z.array(z.string()), [])).toEqual([]);
  });
});
