import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function createAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    advanced: { database: { joins: true } },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
    },
    socialProviders:
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
            },
          }
        : {},
    account: {
      accountLinking: { disableImplicitLinking: true },
    },
    user: {
      validateUserInfo: ({ user }) => {
        const allowed = configuredAdminEmails();
        if (!user.email || !allowed.has(user.email.toLowerCase())) {
          return {
            error: "admin_access_denied",
            errorDescription: "This identity is not allowed to access the control plane.",
          };
        }
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, role: "admin" } }),
        },
      },
    },
    session: {
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), nextCookies()],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not configured.");
  }
  authInstance ??= createAuth();
  return authInstance;
}
