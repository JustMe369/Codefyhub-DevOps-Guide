export type WorkflowDraft = {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  applicablePlatforms: string[];
  applicableVersions: string[];
  prerequisites: string[];
  readingMinutes: number;
  order: number;
  lastVerifiedAt: string;
  verifiedBy: string;
  verificationMethod: string;
  testedVersions: string;
};

const platformPatterns: Array<[string, RegExp]> = [
  ["Windows", /\bwindows\b/i],
  ["macOS", /\b(?:macos|os x|macbook)\b/i],
  ["Ubuntu", /\bubuntu\b/i],
  ["Linux", /\blinux\b/i],
  ["iOS", /\b(?:ios|iphone|ipad)\b/i],
  ["Android", /\bandroid\b/i],
  ["Docker", /\bdocker\b/i],
  ["Kubernetes", /\b(?:kubernetes|k8s)\b/i],
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

function plainText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+.+$/gm, " ")
    .replace(/^\s*(?:[-*+] |\d+[.)] ).+$/gm, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionFromBody(body: string, title: string) {
  const text = plainText(body);
  const fallback = `Follow the approved ${title || "company workflow"} procedure, validation checks, and recovery requirements.`;
  const candidate = text.length >= 20 ? text : fallback;
  return candidate.slice(0, 320).replace(/\s+\S*$/, (ending) => candidate.length > 320 ? "" : ending).trim();
}

function workflowBody(title: string, description: string) {
  return `# ${title || "Workflow draft"}\n\n${description}\n\n## Objective\n\nDefine the verified outcome this workflow must achieve.\n\n## Preconditions\n\n- Confirm the approved request, access, tools, and safety controls.\n- Preserve required evidence before making changes.\n\n## Procedure\n\n1. Record the starting state.\n2. Perform each reviewed action in order.\n3. Stop and escalate if a validation check fails.\n\n## Validation\n\nDocument the observable checks that prove the workflow succeeded.\n\n## Rollback and recovery\n\nDocument how to return to a known-good state and who can authorize recovery.`;
}

function detectedVersions(value: string) {
  const matches = value.matchAll(/\b(?:v(?:ersion)?\s*|windows\s+|macos\s+|ubuntu\s+|ios\s+|android\s+)(\d+(?:\.\d+){0,3})\b/gi);
  return [...new Set([...matches].map((match) => match[1]))].slice(0, 12);
}

export function workflowCompletionIssues(article: WorkflowDraft) {
  const issues: string[] = [];
  if (article.title.trim().length < 4) issues.push("Add a title with at least 4 characters.");
  if (article.description.trim().length < 20) issues.push("Add a description with at least 20 characters.");
  if (article.body.trim().length < 80) issues.push("Add at least 80 characters of Markdown content.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) issues.push("Use a lowercase, hyphenated slug.");
  if (!Number.isInteger(article.readingMinutes) || article.readingMinutes < 1 || article.readingMinutes > 240) issues.push("Set reading time between 1 and 240 minutes.");
  if (!Number.isInteger(article.order) || article.order < 1) issues.push("Set a positive navigation order.");
  if (article.verifiedBy.trim().length < 2) issues.push("Identify the draft owner in Verified by.");
  if (article.verificationMethod.trim().length < 10) issues.push("Describe the current verification method.");
  if (article.testedVersions.trim().length < 2) issues.push("Describe tested versions or state that validation is pending.");
  if (Number.isNaN(new Date(article.lastVerifiedAt).valueOf())) issues.push("Choose a valid last-verified date.");
  return issues;
}

export function completeWorkflowDraft(article: WorkflowDraft, today = new Date()) {
  const completed: string[] = [];
  const next = { ...article };
  const heading = article.body.match(/^#\s+(.+)$/m)?.[1]?.trim();

  if (next.title.trim().length < 4) {
    next.title = heading && heading.length >= 4 ? heading.slice(0, 160) : "Untitled workflow draft";
    completed.push("title");
  }
  if (next.description.trim().length < 20) {
    next.description = descriptionFromBody(next.body, next.title);
    completed.push("description");
  }
  if (next.body.trim().length < 80) {
    next.body = workflowBody(next.title, next.description);
    completed.push("Markdown body");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next.slug)) {
    next.slug = slugify(next.title) || `workflow-${next.id.slice(-8)}`;
    completed.push("slug");
  }

  const wordCount = plainText(next.body).split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.min(240, Math.max(1, Math.ceil(wordCount / 200)));
  if (next.readingMinutes !== readingMinutes) {
    next.readingMinutes = readingMinutes;
    completed.push("reading time");
  }
  if (!Number.isInteger(next.order) || next.order < 1) {
    next.order = 1;
    completed.push("order");
  }
  if (next.applicablePlatforms.length === 0) {
    const platforms = platformPatterns.filter(([, pattern]) => pattern.test(next.body)).map(([name]) => name);
    if (/all (?:major )?operating systems/i.test(next.body)) platforms.push("Windows", "macOS", "Linux", "iOS", "Android");
    next.applicablePlatforms = [...new Set(platforms)];
    if (next.applicablePlatforms.length > 0) completed.push("platforms");
  }
  if (next.applicableVersions.length === 0) {
    next.applicableVersions = detectedVersions(next.body);
    if (next.applicableVersions.length > 0) completed.push("versions");
  }
  if (next.prerequisites.length === 0) {
    next.prerequisites = ["Approved request and accountable owner", "Required access and tools confirmed", "Recovery path and evidence location identified"];
    completed.push("prerequisites");
  }
  if (next.verifiedBy.trim().length < 2) {
    next.verifiedBy = "Workflow owner - confirm before review";
    completed.push("draft owner");
  }
  if (next.verificationMethod.trim().length < 10) {
    next.verificationMethod = "Draft prepared from the workflow content; source review and operational validation are still required.";
    completed.push("verification method");
  }
  if (next.testedVersions.trim().length < 2) {
    next.testedVersions = "Not yet validated";
    completed.push("tested versions");
  }
  if (Number.isNaN(new Date(next.lastVerifiedAt).valueOf())) {
    next.lastVerifiedAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString();
    completed.push("last verified date");
  }

  return { article: next, completed };
}
