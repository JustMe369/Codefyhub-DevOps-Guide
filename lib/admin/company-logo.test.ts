import { describe, expect, it } from "vitest";
import { InvalidCompanyLogoError, parseCompanyLogoDataUrl } from "./company-logo";

describe("parseCompanyLogoDataUrl", () => {
  it("accepts a correctly typed PNG upload", () => {
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
    expect(parseCompanyLogoDataUrl(`data:image/png;base64,${pngHeader}`)).toMatchObject({ mimeType: "image/png" });
  });

  it("rejects SVG and other unsupported formats", () => {
    expect(() => parseCompanyLogoDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toThrow(InvalidCompanyLogoError);
  });

  it("rejects mismatched image signatures", () => {
    const text = Buffer.from("not a png").toString("base64");
    expect(() => parseCompanyLogoDataUrl(`data:image/png;base64,${text}`)).toThrow("does not match");
  });

  it("rejects images larger than the storage limit", () => {
    const oversized = Buffer.alloc(512 * 1024 + 1);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(oversized);
    expect(() => parseCompanyLogoDataUrl(`data:image/png;base64,${oversized.toString("base64")}`)).toThrow("smaller than 512 KB");
  });
});
