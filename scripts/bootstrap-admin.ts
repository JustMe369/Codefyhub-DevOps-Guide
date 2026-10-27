import { config } from "dotenv";

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
  if (existing) {
    if (!existing.role?.split(",").includes("admin")) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "admin" } });
    }
    console.log(`Administrator ${email} already exists.`);
  } else {
    await getAuth().api.createUser({ body: { email, password, name: "Admin", role: "admin" } });
    console.log(`Administrator ${email} created.`);
  }
} finally {
  await prisma.$disconnect();
}
