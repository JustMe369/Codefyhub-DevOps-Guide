import type { Prisma } from "@/generated/prisma/client";

type Identity = { companyId: string; isPlatformAdmin: boolean; permissions: string[] };

export function canReadEditorialKnowledge(identity: Identity) {
  return identity.isPlatformAdmin || ["content.create", "content.edit", "content.review", "content.publish"].some((key) => identity.permissions.includes(key));
}

export function canReadRestrictedKnowledge(identity: Identity) {
  return identity.isPlatformAdmin || ["content.edit", "content.review", "content.publish"].some((key) => identity.permissions.includes(key));
}

export function readerArticleWhere(identity: Identity, now = new Date()): Prisma.ArticleWhereInput {
  return {
    companyId: identity.companyId,
    company: { status: "ACTIVE" },
    status: "PUBLISHED",
    reviewStatus: "APPROVED",
    visibility: { in: canReadRestrictedKnowledge(identity) ? ["PUBLIC", "INTERNAL", "RESTRICTED"] : ["PUBLIC", "INTERNAL"] },
    section: { status: "PUBLISHED" },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export function editorialArticleWhere(identity: Identity): Prisma.ArticleWhereInput {
  if (!canReadEditorialKnowledge(identity)) return readerArticleWhere(identity);
  return { companyId: identity.companyId, ...(canReadRestrictedKnowledge(identity) ? {} : { visibility: { not: "RESTRICTED" } }) };
}
