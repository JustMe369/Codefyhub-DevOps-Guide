"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, FilePlus2, FileText, Monitor, Search, Smartphone, Tablet } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StudioArticle = { id: string; title: string; slug: string; status: string; validationStatus: string; updatedAt: string | Date };
type StudioSection = { id: string; title: string; slug: string; articles: StudioArticle[] };
type ArticleDetail = StudioArticle & { description: string; body: string; contentType: string; visibility: string; section: { title: string; slug: string }; articleSources: unknown[]; versions: unknown[] };

export function StudioWorkspace({ sections, canCreate, canEdit }: { sections: StudioSection[]; canCreate: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(sections[0]?.articles[0]?.id ?? "");
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [template, setTemplate] = useState<"FAQ" | "ISSUE_SOLUTION" | "POLICY">("FAQ");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => sections.map((section) => ({ ...section, articles: section.articles.filter((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase())) })).filter((section) => section.articles.length), [sections, query]);

  async function selectArticle(id: string) {
    setSelectedId(id);
    setArticle(null);
    const response = await fetch(`/api/admin/articles/${id}`);
    const payload = await response.json();
    if (response.ok) setArticle(payload.article);
  }

  async function cloneArticle() {
    if (!selectedId) return;
    const response = await fetch(`/api/admin/articles/${selectedId}/clone`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Clone failed.");
    setMessage(`Draft clone created: ${payload.article.title}`);
  }

  async function createFromTemplate() {
    const sectionId = sections.find((section) => section.articles.some((item) => item.id === selectedId))?.id ?? sections[0]?.id;
    if (!sectionId) return setMessage("Create a section before adding knowledge.");
    const response = await fetch("/api/admin/articles/template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionId, contentType: template }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Template creation failed.");
    router.push(`/admin/articles/${payload.article.id}`);
  }

  return <section className="studio-shell">
    <aside className="studio-rail"><div className="studio-rail-head"><div><span className="eyebrow">Knowledge map</span><strong>{sections.reduce((total, section) => total + section.articles.length, 0)} items</strong></div><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an item…" /></label></div><div className="studio-tree">{filtered.map((section) => <details key={section.id} open><summary>{section.title}<span>{section.articles.length}</span></summary>{section.articles.map((item) => <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => selectArticle(item.id)}><FileText size={14} /><span><strong>{item.title}</strong><small>{item.status.toLowerCase()} · {item.validationStatus.toLowerCase().replaceAll("_", " ")}</small></span></button>)}</details>)}</div></aside>
    <div className="studio-stage"><header className="studio-toolbar"><div><span className="eyebrow">Live workspace</span><strong>{article?.title ?? "Select knowledge from the rail"}</strong></div><div className="studio-actions"><div className="studio-devices"><button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Desktop preview"><Monitor size={16} /></button><button className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} title="Tablet preview"><Tablet size={16} /></button><button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Mobile preview"><Smartphone size={16} /></button></div>{canCreate && <><Link className="studio-new-link" href="/admin/articles/new?type=FAQ"><FilePlus2 size={15} /> New FAQ</Link><div className="studio-template-action"><select value={template} onChange={(event) => setTemplate(event.target.value as typeof template)} aria-label="Quick knowledge template"><option value="FAQ">FAQ</option><option value="ISSUE_SOLUTION">Issue solution</option><option value="POLICY">Policy</option></select><button onClick={createFromTemplate}>Quick draft</button></div></>}{canCreate && <button onClick={cloneArticle} disabled={!selectedId}><Copy size={15} /> Clone draft</button>}{canEdit && selectedId && <Link href={`/admin/articles/${selectedId}`}><ExternalLink size={15} /> Open editor</Link>}</div></header><div className={`studio-preview ${device}`}>{article ? <article className="studio-document"><div className="eyebrow">{article.section.title} · {article.contentType.toLowerCase().replaceAll("_", " ")}</div><h1>{article.title}</h1><p className="studio-lead">{article.description}</p><ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown></article> : <div className="studio-placeholder"><FileText size={38} /><h2>Studio is ready</h2><p>Select an item to inspect its rendered document, clone it into a safe draft, or open the full editor.</p></div>}</div>{message && <div className="studio-toast">{message}</div>}</div>
    <aside className="studio-inspector"><div><span className="eyebrow">Inspector</span><h2>Readiness</h2></div>{article ? <><dl><div><dt>Status</dt><dd><span className={`admin-status ${article.status.toLowerCase()}`}>{article.status}</span></dd></div><div><dt>Visibility</dt><dd>{article.visibility}</dd></div><div><dt>Validation</dt><dd>{article.validationStatus.replaceAll("_", " ")}</dd></div><div><dt>Sources</dt><dd>{article.articleSources.length}</dd></div><div><dt>Revisions</dt><dd>{article.versions.length}</dd></div></dl><div className="studio-checklist"><strong>Publication checks</strong><span className={article.articleSources.length ? "done" : ""}>Evidence source attached</span><span className={article.validationStatus !== "DRAFT" ? "done" : ""}>Technical review complete</span><span className={article.status === "PUBLISHED" ? "done" : ""}>Published release</span></div></> : <p>Document metadata and publication readiness appear here.</p>}</aside>
  </section>;
}
