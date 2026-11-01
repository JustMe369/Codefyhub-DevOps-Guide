import { NextResponse } from "next/server";
import { createArticle } from "@/lib/admin/articles";
import { knowledgeTemplateBodies, knowledgeTemplateSchema } from "@/lib/admin/article-template";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.create");
    const parsed = knowledgeTemplateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid template request." }, { status: 400 });
    const label = parsed.data.contentType.toLowerCase().replaceAll("_", "-");
    const title = parsed.data.title ?? `New ${parsed.data.contentType.toLowerCase().replaceAll("_", " ")}`;
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || label;
    const article = await createArticle({
      sectionId: parsed.data.sectionId,
      slug: `${titleSlug}-${Date.now().toString(36)}`,
      title,
      description: parsed.data.description ?? "Complete this draft with verified company knowledge, accountable ownership, and supporting evidence.",
      body: knowledgeTemplateBodies[parsed.data.contentType],
      difficulty: "FOUNDATION",
      contentType: parsed.data.contentType,
      validationStatus: "DRAFT",
      visibility: parsed.data.visibility,
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
