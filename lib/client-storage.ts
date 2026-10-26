import { z } from "zod";

export function readStored<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export const stringListSchema = z.array(z.string()).max(500);
export const indexListSchema = z.array(z.number().int().nonnegative()).max(100);
