import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const manifestArticleSchema = z.object({
  section: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(8),
  description: z.string().min(30),
  difficulty: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]),
  contentType: z.enum(["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH", "FAQ", "WORKFLOW", "ISSUE_SOLUTION", "POLICY"]),
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
    const bodyPath = resolve(baseDirectory, article.bodyFile);
    const localPath = relative(baseDirectory, bodyPath);
    if (localPath === ".." || localPath.startsWith(`..${sep}`) || resolve(bodyPath) === baseDirectory) throw new Error(`${key}: bodyFile must stay within the manifest directory.`);
    const body = readFileSync(bodyPath, "utf8").trim();
    if (!body.startsWith("## ")) throw new Error(`${key}: article body must start with an H2 heading.`);
    return { ...article, body };
  });
}

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function discoverSourceManifests(directory = resolve(repositoryRoot, "site_content")): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return discoverSourceManifests(path);
    return entry.isFile() && entry.name === "manifest.json" ? [path] : [];
  }).sort();
}

export function loadAllSourceArticles(directory = resolve(repositoryRoot, "site_content")): SourceArticle[] {
  const manifests = discoverSourceManifests(directory);
  if (!manifests.length) throw new Error("No source-content manifests were found.");
  const articles = manifests.flatMap(loadSourceArticles);
  const keys = articles.map((article) => `${article.section}/${article.slug}`);
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate source article key across manifests.");
  const referenced = new Set(manifests.flatMap((path) => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    return manifest.articles.map((article) => resolve(dirname(path), article.bodyFile));
  }));
  function markdownFiles(path: string): string[] {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
      const child = resolve(path, entry.name);
      return entry.isDirectory() ? markdownFiles(child) : entry.isFile() && entry.name.endsWith(".md") ? [child] : [];
    });
  }
  const unlisted = markdownFiles(directory).filter((path) => !referenced.has(path));
  if (unlisted.length) throw new Error(`Source Markdown is missing from manifests: ${unlisted.map((path) => relative(directory, path)).join(", ")}`);
  return articles;
}
