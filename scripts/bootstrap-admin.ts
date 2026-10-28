import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";

config({ path: ".env.local" });

const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

if (!email || !password) {
  throw new Error("Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env.local before running this script.");
}

const { prisma } = await import("@/lib/prisma");
const { getAuth } = await import("@/lib/auth");

try {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  let userId: string;
  if (existing) {
    userId = existing.id;
    if (!existing.role?.split(",").includes("admin")) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "admin" } });
    }
    const credential = await prisma.account.updateMany({
      where: { userId, providerId: "credential" },
      data: { password: await hashPassword(password) },
    });
    if (credential.count === 0) throw new Error(`Administrator ${email} has no password account to reset.`);
    await prisma.session.deleteMany({ where: { userId } });
    console.log(`Administrator ${email} already exists.`);
  } else {
    const created = await getAuth().api.createUser({ body: { email, password, name: "Admin", role: "admin" } });
    userId = created.user.id;
    console.log(`Administrator ${email} created.`);
  }
  const ownerRole = await prisma.companyRole.findUnique({ where: { companyId_slug: { companyId: "codefyhub-company", slug: "company-owner" } } });
  if (!ownerRole) throw new Error("Run database migrations before bootstrapping the administrator.");
  await prisma.membership.upsert({
    where: { companyId_userId: { companyId: "codefyhub-company", userId } },
    update: { roleId: ownerRole.id, status: "ACTIVE", accessVersion: { increment: 1 } },
    create: { companyId: "codefyhub-company", userId, roleId: ownerRole.id },
  });
} finally {
  await prisma.$disconnect();
}
