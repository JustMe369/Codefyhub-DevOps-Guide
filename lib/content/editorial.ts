type EditorialArticle = {
  body: string;
  contentType: string;
  validationStatus: string;
  applicablePlatforms: string[];
  applicableVersions: string[];
  prerequisites: string[];
  testedAt: Date | null;
  testEnvironment: string | null;
  verifiedBy: string;
  verificationMethod: string;
  testedVersions: string;
  lastVerifiedAt: Date;
};

export function editorialIssues(article: EditorialArticle, now = new Date(), options: { requireReviewed?: boolean } = {}): string[] {
  const issues: string[] = [];
  if (!/^##\s+\S/m.test(article.body)) issues.push("Add H2 headings to structure the article.");
  const headings = [...article.body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-"));
  if (new Set(headings).size !== headings.length) issues.push("Give every H2 heading a unique anchor.");
  if (options.requireReviewed !== false && article.validationStatus === "DRAFT") issues.push("Complete technical source review.");
  if (!article.verifiedBy.trim() || !article.verificationMethod.trim() || !article.testedVersions.trim()) issues.push("Complete verification evidence.");
  if (article.lastVerifiedAt > now) issues.push("Verification cannot be dated in the future.");
  if (article.validationStatus === "LAB_TESTED") {
    if (!article.testedAt || !article.testEnvironment?.trim()) issues.push("Lab-tested content requires a test date and environment.");
    if (article.testedAt && article.testedAt > now) issues.push("The test date cannot be in the future.");
  } else if (article.testedAt || article.testEnvironment) issues.push("Only lab-tested content may claim a test date or environment.");
  if (["HOW_TO", "RUNBOOK", "WORKFLOW", "CONFIGURATION_RECIPE", "ISSUE_SOLUTION"].includes(article.contentType)) {
    if (!article.applicablePlatforms.length || !article.applicableVersions.length) issues.push("Record applicable platforms and versions.");
    if (!article.prerequisites.length) issues.push("Record operational prerequisites.");
    if (!/expected (outcome|output)|^##\s+(Validation|Verification)/im.test(article.body)) issues.push("Describe the expected outcome or validation checks.");
  }
  return issues;
}
