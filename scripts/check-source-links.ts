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
    let lastError: unknown;
    let succeeded = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(source.url, {
          redirect: "follow",
          signal: AbortSignal.timeout(15_000),
          headers: { "user-agent": "Codefyhub-DevOps-Guide-Link-Validator/1.0" },
        });
        if (response.ok) {
          console.log(`OK ${response.status} ${source.url}`);
          succeeded = true;
          break;
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      // Transient DNS, TLS and rate-limit faults on third-party docs sites
      // are common; retry a few times before reporting failure.
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
    if (!succeeded) failures.push(`${source.url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }
  if (failures.length) {
    for (const failure of failures) console.error(`ERROR ${failure}`);
    process.exitCode = 1;
  } else console.log(`Validated ${sources.length} official source URLs.`);
} finally {
  await prisma.$disconnect();
}
