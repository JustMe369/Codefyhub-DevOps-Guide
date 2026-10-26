import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for source-link validation.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const sources = await prisma.source.findMany({ orderBy: { url: "asc" } });
  const failures: string[] = [];
  for (const source of sources) {
    try {
      const response = await fetch(source.url, { redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "Codefyhub-DevOps-Guide-Link-Validator/1.0" } });
      if (!response.ok) failures.push(`${source.url}: HTTP ${response.status}`);
      else console.log(`OK ${response.status} ${source.url}`);
    } catch (error) {
      failures.push(`${source.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) {
    for (const failure of failures) console.error(`ERROR ${failure}`);
    process.exitCode = 1;
  } else console.log(`Validated ${sources.length} official source URLs.`);
} finally {
  await prisma.$disconnect();
}
