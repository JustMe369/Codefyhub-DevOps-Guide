const MAX_COMPANY_LOGO_BYTES = 512 * 1024;

const signatures: Record<string, (bytes: Buffer) => boolean> = {
  "image/png": (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/webp": (bytes) => bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
};

export class InvalidCompanyLogoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCompanyLogoError";
  }
}

export function parseCompanyLogoDataUrl(value: string): { data: Uint8Array<ArrayBuffer>; mimeType: string } {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new InvalidCompanyLogoError("Use a PNG, JPEG, or WebP logo image.");

  const mimeType = match[1];
  const encoded = match[2];
  const data = Buffer.from(encoded, "base64");
  if (!data.length || data.length > MAX_COMPANY_LOGO_BYTES) {
    throw new InvalidCompanyLogoError("Logo images must be smaller than 512 KB.");
  }
  if (data.toString("base64") !== encoded || !signatures[mimeType](data)) {
    throw new InvalidCompanyLogoError("The logo file does not match its image type.");
  }
  const imageData = new Uint8Array(data.byteLength);
  imageData.set(data);
  return { data: imageData, mimeType };
}
