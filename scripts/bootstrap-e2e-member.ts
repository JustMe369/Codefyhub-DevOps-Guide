import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";

config({ path: ".env.local" });

const email = process.env.MEMBER_TEST_EMAIL?.trim().toLowerCase();
const password = process.env.MEMBER_TEST_PASSWORD;

if (!email || !password) {
  throw new Error("Set MEMBER_TEST_EMAIL and MEMBER_TEST_PASSWORD before bootstrapping the E2E member.");
}

const { prisma } = await import("@/lib/prisma");
const { getAuth } = await import("@/lib/auth");

try {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  let userId: string;
  if (existing) {
    userId = existing.id;
    const credential = await prisma.account.updateMany({
      where: { userId, providerId: "credential" },
      data: { password: await hashPassword(password) },
    });
    if (credential.count === 0) throw new Error(`E2E member ${email} has no password account to reset.`);
    await prisma.session.deleteMany({ where: { userId } });
  } else {
    const created = await getAuth().api.createUser({ body: { email, password, name: "E2E Member" } });
    userId = created.user.id;
  }

  const companyId = "codefyhub-company";
  const viewerRole = await prisma.companyRole.findUnique({ where: { companyId_slug: { companyId, slug: "viewer" } } });
  if (!viewerRole) throw new Error("Run database migrations and seed before bootstrapping the E2E member.");
  await prisma.membership.upsert({
    where: { companyId_userId: { companyId, userId } },
    update: { roleId: viewerRole.id, status: "ACTIVE", accessVersion: { increment: 1 } },
    create: { companyId, userId, roleId: viewerRole.id },
  });
} finally {
  await prisma.$disconnect();
}
