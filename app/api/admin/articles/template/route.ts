import { NextResponse } from "next/server";
import { z } from "zod";
import { createArticle } from "@/lib/admin/articles";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";

export const runtime = "nodejs";
const templateSchema = z.object({ sectionId: z.string().cuid(), contentType: z.enum(["FAQ", "WORKFLOW", "ISSUE_SOLUTION", "POLICY"]) });

const bodies = {
  FAQ: "## Question\n\nWrite the exact question employees ask.\n\n## Answer\n\nProvide the short, verified answer first.\n\n## Details\n\nAdd conditions, exceptions, ownership, and links to authoritative sources.",
  WORKFLOW: "## Purpose\n\nExplain the business outcome and the department responsible for it.\n\n## Prerequisites\n\nList access, approvals, and required inputs.\n\n## Procedure\n\n1. Record the first controlled step.\n2. Add validation before changing state.\n3. Define the hand-off and completion evidence.\n\n## Rollback and escalation\n\nDocument recovery, escalation owner, and expected response time.",
  ISSUE_SOLUTION: "## Symptoms\n\nRecord the observable problem and affected service.\n\n## Impact\n\nDescribe users, data, and operations affected.\n\n## Root cause\n\nDocument verified evidence, not assumptions.\n\n## Resolution\n\n1. Preserve evidence.\n2. Apply the reviewed remediation.\n3. Validate service and data integrity.\n\n## Prevention\n\nList monitoring, automation, or policy changes that prevent recurrence.",
  POLICY: "## Policy statement\n\nState the mandatory rule in direct language.\n\n## Scope\n\nDefine teams, systems, and information covered.\n\n## Responsibilities\n\nIdentify owners, approvers, and operators.\n\n## Controls and evidence\n\nDescribe required controls and retained proof.\n\n## Exceptions\n\nDefine the approval and expiry process for exceptions.",
} as const;

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.create");
    const parsed = templateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid template request." }, { status: 400 });
    const label = parsed.data.contentType.toLowerCase().replaceAll("_", "-");
    const article = await createArticle({
      sectionId: parsed.data.sectionId,
      slug: `${label}-${Date.now().toString(36)}`,
      title: `New ${parsed.data.contentType.toLowerCase().replaceAll("_", " ")}`,
      description: "Complete this draft with verified company knowledge, accountable ownership, and supporting evidence.",
      body: bodies[parsed.data.contentType],
      difficulty: "FOUNDATION",
      contentType: parsed.data.contentType,
      validationStatus: "DRAFT",
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
      changeSummary: `Created from ${parsed.data.contentType} knowledge template`,
    }, actor);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
