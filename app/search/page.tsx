import Link from "next/link";
import { Search } from "lucide-react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { searchKnowledge } from "@/lib/search";

const searchSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  section: z.string().regex(/^[a-z0-9-]+$/).optional().catch(undefined),
  type: z.enum(["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH", "FAQ", "WORKFLOW", "ISSUE_SOLUTION", "POLICY"]).optional().catch(undefined),
  difficulty: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]).optional().catch(undefined)
});

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = searchSchema.parse({ q: first(params.q) ?? "", section: first(params.section), type: first(params.type), difficulty: first(params.difficulty) });
  const results = await searchKnowledge(parsed.q, { section: parsed.section, contentType: parsed.type, difficulty: parsed.difficulty });
  const sections = await prisma.section.findMany({ where: { status: "PUBLISHED", company: { isPublic: true, status: "ACTIVE" } }, orderBy: { order: "asc" }, select: { slug: true, title: true } });

  return (
    <div className="shell search-page">
      <div className="eyebrow">Knowledge search</div>
      <h1>Find the procedure, not the noise.</h1>
      <p>Search titles, headings, commands, configuration, tags, glossary definitions, and article text. Use Ctrl/Cmd+K from any page.</p>
      <form className="search-workbench" action="/search">
        <div className="search-large"><input name="q" type="search" defaultValue={parsed.q} placeholder="Try: mdadm --detail, degraded RAID, MTU…" aria-label="Search query" autoFocus /><button className="button button-primary" type="submit"><Search size={16} />Search</button></div>
        <div className="search-filters" aria-label="Search filters">
          <label>Category<select name="section" defaultValue={parsed.section ?? ""}><option value="">All categories</option>{sections.map((section) => <option value={section.slug} key={section.slug}>{section.title}</option>)}</select></label>
          <label>Content type<select name="type" defaultValue={parsed.type ?? ""}><option value="">All types</option><option value="FAQ">FAQ</option><option value="WORKFLOW">Workflow</option><option value="ISSUE_SOLUTION">Issue solution</option><option value="POLICY">Policy</option><option value="HOW_TO">How-to</option><option value="RUNBOOK">Runbook</option><option value="REFERENCE">Reference</option><option value="CONCEPT">Concept</option><option value="CONFIGURATION_RECIPE">Configuration recipe</option><option value="LEARNING_PATH">Learning path</option></select></label>
          <label>Difficulty<select name="difficulty" defaultValue={parsed.difficulty ?? ""}><option value="">All levels</option><option value="FOUNDATION">Foundation</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
        </div>
      </form>
      <div className="search-results" aria-live="polite">
        {parsed.q.length > 0 && parsed.q.length < 2 && <p>Enter at least two characters.</p>}
        {parsed.q.length >= 2 && results.length === 0 && <div className="search-empty"><h2>No matches</h2><p>Try a product name, exact command, shorter error fragment, or remove a filter.</p></div>}
        {results.map((result) => (
          <Link className="search-result" href={result.kind === "glossary" ? `/glossary#${result.id}` : `/guides/${result.sectionSlug}/${result.articleSlug}`} key={`${result.kind}-${result.id}`}>
            <div className="search-result-meta"><span>{result.sectionTitle}</span><span>{result.contentType.toLowerCase().replaceAll("_", " ")}</span><span>{result.difficulty.toLowerCase()}</span></div>
            <h2>{result.title}</h2>
            <p>{result.snippet || result.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
