import { getAuth } from "@/lib/auth";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
};

export async function getAdminIdentity(requestHeaders: Headers): Promise<AdminIdentity | null> {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.ADMIN_EMAILS) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const roles = (session.user.role ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  if (!roles.includes("admin")) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireAdminIdentity(requestHeaders: Headers) {
  const identity = await getAdminIdentity(requestHeaders);
  if (!identity) throw new AdminAuthorizationError();
  return identity;
}

export class AdminAuthorizationError extends Error {
  constructor() {
    super("Administrator authentication is required.");
    this.name = "AdminAuthorizationError";
  }
}
