import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for internal-link validation.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const articles = await prisma.article.findMany({ where: { status: "PUBLISHED" }, include: { section: true } });
  const valid = new Set(articles.map((article) => `/guides/${article.section.slug}/${article.slug}`));
  const errors: string[] = [];
  for (const article of articles) {
    const key = `${article.section.slug}/${article.slug}`;
    for (const match of article.body.matchAll(/\]\((\/guides\/[a-z0-9-]+\/[a-z0-9-]+)(?:#[^)]+)?\)/g)) if (!valid.has(match[1])) errors.push(`${key}: broken link ${match[1]}`);
    for (const related of article.relatedGuides) if (!valid.has(`/guides/${related}`)) errors.push(`${key}: missing related guide ${related}`);
  }
  if (errors.length) { errors.forEach((error) => console.error(`ERROR ${error}`)); process.exitCode = 1; }
  else console.log(`Validated internal links and relationships for ${articles.length} articles.`);
} finally { await prisma.$disconnect(); }
