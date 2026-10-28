import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

function createAuth() {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    ...(process.env.NODE_ENV === "production" ? {} : { trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"] }),
    advanced: { database: { joins: true } },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
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
