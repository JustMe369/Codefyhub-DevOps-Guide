import { loadSourceArticles, repositoryRoot } from "../lib/content/source-content";

const articles = [
  ...loadSourceArticles(`${repositoryRoot}/site_content/storage-raid/manifest.json`),
  ...loadSourceArticles(`${repositoryRoot}/site_content/devops-department/manifest.json`),
];
const errors: string[] = [];
const requiredByType: Record<string, RegExp[]> = {
  HOW_TO: [/^## Objective and scenario$/m, /^## Applicability and limitations$/m, /^## Prerequisites$/m, /^## Verification checklist$/m, /^## Troubleshooting$/m, /^## Rollback and recovery$/m],
  RUNBOOK: [/^## Condition and safety boundary$/m, /^## Trigger symptoms$/m, /^## Decision table$/m, /^## Verification checklist$/m, /^## Troubleshooting matrix$/m, /^## Abort, rollback, and recovery$/m],
  WORKFLOW: [/^## Purpose and ownership$/m, /^## Access requirements$/m, /^## Connection profile$/m, /^## Expected outcome and verification$/m, /^## Troubleshooting$/m, /^## Security and session closeout$/m]
};

for (const article of articles) {
  const key = `${article.section}/${article.slug}`;
  for (const pattern of requiredByType[article.contentType] ?? []) if (!pattern.test(article.body)) errors.push(`${key}: missing required section matching ${pattern}`);
  const anchors = [...article.body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-"));
  if (new Set(anchors).size !== anchors.length) errors.push(`${key}: duplicate H2/H3 anchor`);
  if (/\b(LAB_TESTED|Lab-tested)\b/.test(article.body) && article.validationStatus !== "LAB_TESTED") errors.push(`${key}: body implies lab-tested status without evidence metadata`);
  if (!/expected (outcome|output)/i.test(article.body)) errors.push(`${key}: missing representative expected outcome or output`);
  if (!article.body.includes("```")) errors.push(`${key}: operational content has no command or configuration block`);
}

if (errors.length) { errors.forEach((error) => console.error(`ERROR ${error}`)); process.exitCode = 1; }
else console.log(`Validated ${articles.length} source-authored vertical-slice articles.`);
