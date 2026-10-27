import { config } from "dotenv";

config({ path: ".env.local" });
const { searchKnowledge } = await import("../lib/search");
const { prisma } = await import("../lib/prisma");
const evaluations = [
  { query: "mdadm --detail", expected: "storage-raid/mdadm-zfs" },
  { query: "mdadm cannot open", expected: "storage-raid/degraded-mdadm-recovery" },
  { query: "mdadm", expected: "storage-raid/mdadm-zfs" },
  { query: "replace failed RAID1 disk", expected: "storage-raid/degraded-mdadm-recovery" }
];
const errors: string[] = [];
try {
  for (const evaluation of evaluations) {
    const results = await searchKnowledge(evaluation.query, { limit: 10 });
    if (!results.some((result) => `${result.sectionSlug}/${result.articleSlug}` === evaluation.expected)) errors.push(`"${evaluation.query}" did not find ${evaluation.expected}`);
  }
  const empty = await searchKnowledge("definitely-no-such-topic-xyz", { limit: 10 });
  if (empty.length) errors.push("no-result evaluation unexpectedly returned results");
  if (errors.length) { errors.forEach((error) => console.error(`ERROR ${error}`)); process.exitCode = 1; }
  else console.log(`Search evaluation passed for ${evaluations.length} positive queries and one no-result query.`);
} finally { await prisma.$disconnect(); }
