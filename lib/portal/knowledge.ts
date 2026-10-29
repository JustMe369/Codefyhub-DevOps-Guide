import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getAdminIdentity, canAccessRestrictedKnowledge, type AdminIdentity } from "@/lib/admin/authz";

export const portalContentTypes = ["FAQ", "WORKFLOW", "ISSUE_SOLUTION", "POLICY", "HOW_TO", "RUNBOOK", "REFERENCE"] as const;
export type PortalContentType = (typeof portalContentTypes)[number];

export const portalContentTypeLabels: Record<PortalContentType, string> = {
  FAQ: "Questions & answers",
  WORKFLOW: "Workflows",
  ISSUE_SOLUTION: "Issue solutions",
  POLICY: "Policies",
  HOW_TO: "How-to guides",
  RUNBOOK: "Runbooks",
  REFERENCE: "References",
};

export function isPortalContentType(value: string | undefined): value is PortalContentType {
  return Boolean(value && portalContentTypes.includes(value as PortalContentType));
}

export async function getPortalIdentity(requestHeaders: Headers) {
  const identity = await getAdminIdentity(requestHeaders);
  if (!identity || !identity.permissions.includes("content.view")) return null;
  return identity;
}

export function portalArticleWhere(identity: AdminIdentity, now = new Date()): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = {
    companyId: identity.companyId,
    status: "PUBLISHED",
    reviewStatus: "APPROVED",
    section: { status: "PUBLISHED" },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
  if (!canAccessRestrictedKnowledge(identity)) where.visibility = { not: "RESTRICTED" };
  return where;
}

export function contentTypeLabel(value: string) {
  return portalContentTypeLabels[value as PortalContentType] ?? value.toLowerCase().replaceAll("_", " ");
}
