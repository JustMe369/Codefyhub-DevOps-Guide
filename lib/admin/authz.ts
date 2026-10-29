import "server-only";
import { getAuth } from "@/lib/auth";
import { permissionKeys, type PermissionKey } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";

export const ACTIVE_COMPANY_COOKIE = "codefyhub_active_company";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  companyId: string;
  companyName: string;
  companySlug: string;
  hasCompanyLogo: boolean;
  membershipId: string | null;
  roleId: string | null;
  roleName: string;
  roleSlug: string;
  permissions: string[];
};

function cookieValue(headers: Headers, name: string) {
  const cookie = headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function getAdminIdentity(requestHeaders: Headers): Promise<AdminIdentity | null> {
  if (!process.env.BETTER_AUTH_SECRET) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const platformRoles = (session.user.role ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  const isPlatformAdmin = platformRoles.includes("admin");
  const selectedCompanyId = cookieValue(requestHeaders, ACTIVE_COMPANY_COOKIE);

  const findMembership = (companyId?: string | null) => prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      company: { status: "ACTIVE", ...(companyId ? { id: companyId } : {}) },
    },
    include: {
      company: { select: { id: true, name: true, slug: true, status: true, logoMimeType: true } },
      role: { include: { permissions: { select: { permissionId: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  const membership = await findMembership(selectedCompanyId) ?? (selectedCompanyId ? await findMembership() : null);

  const findPlatformCompany = (companyId?: string | null) => prisma.company.findFirst({
        where: { status: "ACTIVE", ...(companyId ? { id: companyId } : {}) },
        select: { id: true, name: true, slug: true, status: true, logoMimeType: true },
        orderBy: { createdAt: "asc" },
      });
  const platformCompany = isPlatformAdmin
    ? await findPlatformCompany(selectedCompanyId) ?? (selectedCompanyId ? await findPlatformCompany() : null)
    : null;
  const company = membership?.company ?? platformCompany;
  if (!company) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isPlatformAdmin,
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
    hasCompanyLogo: Boolean(company.logoMimeType),
    membershipId: membership?.id ?? null,
    roleId: membership?.roleId ?? null,
    roleName: membership?.role.name ?? (isPlatformAdmin ? "Platform Admin" : "Member"),
    roleSlug: membership?.role.slug ?? (isPlatformAdmin ? "platform-admin" : "member"),
    permissions: isPlatformAdmin ? [...permissionKeys] : (membership?.role.permissions.map(({ permissionId }) => permissionId) ?? []),
  };
}

export async function requireAdminIdentity(requestHeaders: Headers, permission?: PermissionKey) {
  const identity = await getAdminIdentity(requestHeaders);
  if (!identity) throw new AdminAuthorizationError();
  if (permission && !identity.permissions.includes(permission)) throw new AdminForbiddenError(permission);
  return identity;
}

export function articleAccessWhere(identity: AdminIdentity) {
  const canReadRestricted = canAccessRestrictedKnowledge(identity);
  return { companyId: identity.companyId, ...(canReadRestricted ? {} : { visibility: { not: "RESTRICTED" as const } }) };
}

export function canAccessRestrictedKnowledge(identity: AdminIdentity) {
  return identity.isPlatformAdmin || ["content.edit", "content.review", "content.publish"].some((permission) => identity.permissions.includes(permission));
}

export async function listAvailableCompanies(identity: AdminIdentity) {
  if (identity.isPlatformAdmin) {
    return prisma.company.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, slug: true, isPublic: true },
      orderBy: { name: "asc" },
    });
  }
  const memberships = await prisma.membership.findMany({
    where: { userId: identity.id, status: "ACTIVE", company: { status: "ACTIVE" } },
    select: { company: { select: { id: true, name: true, slug: true, isPublic: true } } },
    orderBy: { company: { name: "asc" } },
  });
  return memberships.map(({ company }) => company);
}

export class AdminAuthorizationError extends Error {
  constructor() {
    super("Administrator authentication is required.");
    this.name = "AdminAuthorizationError";
  }
}

export class AdminForbiddenError extends Error {
  constructor(permission: PermissionKey) {
    super(`The ${permission} permission is required.`);
    this.name = "AdminForbiddenError";
  }
}
