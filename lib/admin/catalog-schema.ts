import { z } from "zod";

const slug = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const tagSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(80),
});

export const sectionSchema = z.object({
  slug,
  title: z.string().trim().min(2).max(100),
  summary: z.string().trim().min(10).max(500),
  icon: z.string().trim().min(1).max(80),
  order: z.number().int().min(1).max(10_000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
