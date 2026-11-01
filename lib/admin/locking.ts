import type { Prisma } from "@/generated/prisma/client";

// Every article lifecycle mutation uses the same row lock before reading state.
export async function lockArticle(tx: Prisma.TransactionClient, id: string, companyId: string) {
  await lockCompany(tx, companyId);
  await tx.$queryRaw`SELECT "id" FROM "Article" WHERE "id" = ${id} AND "companyId" = ${companyId} FOR UPDATE`;
}

export async function lockCompany(tx: Prisma.TransactionClient, companyId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${companyId} FOR UPDATE`;
}
