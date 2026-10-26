import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for content validation.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const errors: string[] = [];
const warnings: string[] = [];

try {
  const sections = await prisma.section.findMany({
    where: { status: "PUBLISHED" },
    include: { articles: { where: { status: "PUBLISHED" }, include: { _count: { select: { articleSources: true, versions: true } } } } }
  });
  const articles = sections.flatMap((section) => section.articles.map((article) => ({ ...article, section: section.slug })));
  const banned = [
    ["gh repo download", "unsupported GitHub CLI command"],
    ["gh repo delete owner/repo --confirm", "obsolete destructive flag"],
    ["cloudflared service install \\\n  --hostname", "obsolete Cloudflare service syntax"],
    ["Auto-login for the SSH server", "unsafe auto-login advice"]
  ] as const;

  for (const article of articles) {
    const words = article.body.trim().split(/\s+/).length;
    const expectedMinutes = Math.max(2, Math.ceil(words / 180));
    if (!article.body.includes("## ")) errors.push(`${article.section}/${article.slug}: missing H2 structure`);
    if (article._count.articleSources === 0) errors.push(`${article.section}/${article.slug}: no official source mapping`);
    if (article._count.versions === 0) errors.push(`${article.section}/${article.slug}: no revision snapshot`);
    if (article.readingMinutes !== expectedMinutes) warnings.push(`${article.section}/${article.slug}: reading time should be ${expectedMinutes}, stored ${article.readingMinutes}`);
    if (words < 140) warnings.push(`${article.section}/${article.slug}: only ${words} words`);
    for (const [needle, reason] of banned) if (article.body.includes(needle)) errors.push(`${article.section}/${article.slug}: ${reason}`);
  }

  const sectionNames = new Set(articles.map((article) => article.section));
  for (const section of sections) if (!sectionNames.has(section.slug)) errors.push(`${section.slug}: published section has no articles`);

  const staleBefore = new Date();
  staleBefore.setFullYear(staleBefore.getFullYear() - 1);
  for (const article of articles.filter((item) => item.lastVerifiedAt < staleBefore)) warnings.push(`${article.section}/${article.slug}: verification is over one year old`);

  console.log(`Validated ${sections.length} sections and ${articles.length} published articles.`);
  for (const warning of warnings) console.warn(`WARN ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
  } else console.log(`Content gate passed with ${warnings.length} warning(s).`);
} finally {
  await prisma.$disconnect();
}
