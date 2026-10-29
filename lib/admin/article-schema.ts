import { z } from "zod";

const slug = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const stringList = z.array(z.string().trim().min(1).max(160)).max(30);

export const articleFieldsSchema = z.object({
  sectionId: z.string().cuid(),
  slug,
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(20).max(320),
  body: z.string().trim().min(80).max(500_000),
  difficulty: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]),
  contentType: z.enum(["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH", "FAQ", "ISSUE_SOLUTION", "POLICY"]),
  validationStatus: z.enum(["DRAFT", "SOURCE_REVIEWED", "LAB_TESTED"]),
  visibility: z.enum(["PUBLIC", "INTERNAL", "RESTRICTED"]),
  applicablePlatforms: stringList,
  applicableVersions: stringList,
  prerequisites: stringList,
  relatedGuides: stringList,
  readingMinutes: z.number().int().min(1).max(240),
  order: z.number().int().min(1).max(10_000),
  lastVerifiedAt: z.coerce.date(),
  verifiedBy: z.string().trim().min(2).max(120),
  verificationMethod: z.string().trim().min(10).max(500),
  testedVersions: z.string().trim().min(2).max(500),
  testedAt: z.coerce.date().nullable(),
  testEnvironment: z.string().trim().max(500).nullable(),
  reviewDueAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
});

export const createArticleSchema = articleFieldsSchema.omit({ order: true }).extend({
  order: articleFieldsSchema.shape.order.optional(),
  visibility: articleFieldsSchema.shape.visibility.default("INTERNAL"),
  reviewDueAt: articleFieldsSchema.shape.reviewDueAt.default(null),
  expiresAt: articleFieldsSchema.shape.expiresAt.default(null),
  changeSummary: z.string().trim().min(3).max(240),
});

export const updateArticleSchema = z.object({
  expectedUpdatedAt: z.coerce.date(),
  changeSummary: z.string().trim().min(3).max(240),
  data: articleFieldsSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required."),
});

export const listArticlesSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  section: z.string().regex(/^[a-z0-9-]+$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
