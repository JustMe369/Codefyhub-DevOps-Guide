import { config } from "dotenv";

config({ path: ".env.local" });

const { prisma } = await import("../lib/prisma");

if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  throw new Error("The administrator control-plane environment is incomplete.");
}

try {
  const administrators = await prisma.user.findMany({
    where: {
      role: { contains: "admin" },
      memberships: { some: { status: "ACTIVE", company: { status: "ACTIVE" } } },
      accounts: { some: { providerId: "credential", password: { not: null } } },
    },
    select: { id: true },
  });

  if (administrators.length === 0) {
    throw new Error("No active password administrator is ready for the control plane.");
  }

  console.log(`Control plane has ${administrators.length} active password administrator account(s).`);
} finally {
  await prisma.$disconnect();
}
