import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const manifestArticleSchema = z.object({
  section: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(8),
  description: z.string().min(30),
  difficulty: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]),
  contentType: z.enum(["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH", "FAQ", "ISSUE_SOLUTION", "POLICY"]),
  validationStatus: z.enum(["DRAFT", "SOURCE_REVIEWED", "LAB_TESTED"]),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
  order: z.number().int().positive(),
  bodyFile: z.string().endsWith(".md"),
  tags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1),
  prerequisites: z.array(z.string()),
  relatedGuides: z.array(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)),
  applicablePlatforms: z.array(z.string()).min(1),
  applicableVersions: z.array(z.string()).min(1),
  sourceTitles: z.array(z.string()).min(1),
  reviewedAt: z.string().date(),
  testedAt: z.string().date().nullable(),
  testEnvironment: z.string().min(1).nullable()
}).superRefine((article, ctx) => {
  if (article.validationStatus === "LAB_TESTED" && (!article.testedAt || !article.testEnvironment)) {
    ctx.addIssue({ code: "custom", message: "Lab-tested content requires testedAt and testEnvironment." });
  }
  if (article.validationStatus !== "LAB_TESTED" && (article.testedAt || article.testEnvironment)) {
    ctx.addIssue({ code: "custom", message: "Only lab-tested content may claim a test date or environment." });
  }
});

const manifestSchema = z.object({ articles: z.array(manifestArticleSchema).min(1) });

export type SourceArticle = z.infer<typeof manifestArticleSchema> & { body: string };

export function loadSourceArticles(manifestPath: string): SourceArticle[] {
  const absoluteManifest = resolve(manifestPath);
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(absoluteManifest, "utf8")));
  const baseDirectory = dirname(absoluteManifest);
  const seen = new Set<string>();

  return manifest.articles.map((article) => {
    const key = `${article.section}/${article.slug}`;
    if (seen.has(key)) throw new Error(`Duplicate source article key: ${key}`);
    seen.add(key);
    const body = readFileSync(resolve(baseDirectory, article.bodyFile), "utf8").trim();
    if (!body.startsWith("## ")) throw new Error(`${key}: article body must start with an H2 heading.`);
    return { ...article, body };
  });
}

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
