import { NextResponse } from "next/server";
import { z } from "zod";
import { createArticle } from "@/lib/admin/articles";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";

export const runtime = "nodejs";
const templateSchema = z.object({
  sectionId: z.string().cuid(),
  contentType: z.enum(["FAQ", "ISSUE_SOLUTION", "POLICY"]),
  title: z.string().trim().min(4).max(160).optional(),
  description: z.string().trim().min(20).max(320).optional(),
});

const bodies = {
  FAQ: "## Question\n\nWrite the exact question employees ask.\n\n## Answer\n\nProvide the short, verified answer first.\n\n## Details\n\nAdd conditions, exceptions, ownership, and links to authoritative sources.",
  ISSUE_SOLUTION: "## Symptoms\n\nRecord the observable problem and affected service.\n\n## Impact\n\nDescribe users, data, and operations affected.\n\n## Root cause\n\nDocument verified evidence, not assumptions.\n\n## Resolution\n\n1. Preserve evidence.\n2. Apply the reviewed remediation.\n3. Validate service and data integrity.\n\n## Prevention\n\nList monitoring, automation, or policy changes that prevent recurrence.",
  POLICY: "## Policy statement\n\nState the mandatory rule in direct language.\n\n## Scope\n\nDefine teams, systems, and information covered.\n\n## Responsibilities\n\nIdentify owners, approvers, and operators.\n\n## Controls and evidence\n\nDescribe required controls and retained proof.\n\n## Exceptions\n\nDefine the approval and expiry process for exceptions.",
} as const;

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.create");
    const parsed = templateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid template request." }, { status: 400 });
    const label = parsed.data.contentType.toLowerCase().replaceAll("_", "-");
    const title = parsed.data.title ?? `New ${parsed.data.contentType.toLowerCase().replaceAll("_", " ")}`;
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || label;
    const article = await createArticle({
      sectionId: parsed.data.sectionId,
      slug: `${titleSlug}-${Date.now().toString(36)}`,
      title,
      description: parsed.data.description ?? "Complete this draft with verified company knowledge, accountable ownership, and supporting evidence.",
      body: bodies[parsed.data.contentType],
      difficulty: "FOUNDATION",
      contentType: parsed.data.contentType,
      validationStatus: "DRAFT",
      visibility: "INTERNAL",
      applicablePlatforms: [],
      applicableVersions: [],
      prerequisites: [],
      relatedGuides: [],
      readingMinutes: 5,
      lastVerifiedAt: new Date(),
      verifiedBy: actor.name,
      verificationMethod: "Draft template; review and validation are required before publication.",
      testedVersions: "Not yet validated",
      testedAt: null,
      testEnvironment: null,
      reviewDueAt: null,
      expiresAt: null,
      changeSummary: `Created from ${parsed.data.contentType} knowledge template`,
    }, actor);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
