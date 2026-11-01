import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { discoverSourceManifests, loadAllSourceArticles, repositoryRoot } from "./source-content";

const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
it("discovers nested manifests and rejects unlisted source Markdown", () => {
  const directory = mkdtempSync(join(tmpdir(), "devops-source-test-")); temporary.push(directory);
  const nested = join(directory, "nested"); mkdirSync(nested);
  const original = JSON.parse(readFileSync(join(repositoryRoot, "site_content/storage-raid/manifest.json"), "utf8"));
  const article = original.articles[0]; article.bodyFile = "body.md";
  writeFileSync(join(nested, "manifest.json"), JSON.stringify({ articles: [article] }));
  writeFileSync(join(nested, "body.md"), "## Objective\n\nSource fixture.");
  expect(discoverSourceManifests(directory)).toEqual([join(nested, "manifest.json")]);
  expect(loadAllSourceArticles(directory)).toHaveLength(1);
  writeFileSync(join(directory, "unlisted.md"), "## Missing manifest");
  expect(() => loadAllSourceArticles(directory)).toThrow("missing from manifests");
});
