import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for tenant integrity validation.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const verified = "TENANT_BOUNDARY_VERIFIED";

try {
  await prisma.$transaction(async (tx) => {
    const article = await tx.article.findFirst({ select: { id: true } });
    if (!article) throw new Error("Tenant check requires at least one article.");
    const company = await tx.company.create({ data: { name: "Tenant boundary check", slug: `tenant-check-${Date.now()}` } });
    const section = await tx.section.create({ data: { companyId: company.id, slug: "boundary", title: "Boundary", summary: "Temporary tenant integrity validation", icon: "shield", order: 1 } });
    try {
      await tx.article.update({ where: { id: article.id }, data: { sectionId: section.id } });
    } catch {
      throw new Error(verified);
    }
    throw new Error("Cross-company article move was not rejected.");
  });
} catch (error) {
  if (!(error instanceof Error) || error.message !== verified) throw error;
  console.log("Database tenant boundary rejected a cross-company article relationship.");
} finally {
  await prisma.$disconnect();
}
