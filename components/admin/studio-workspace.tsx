"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, FilePlus2, FileText, Monitor, Search, Smartphone, Tablet, CheckCircle, Clock, GitBranch, Hash, XCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StudioArticle = { id: string; title: string; slug: string; status: string; validationStatus: string; reviewStatus: string; updatedAt: string | Date };
type StudioSection = { id: string; title: string; slug: string; articles: StudioArticle[] };
type ArticleDetail = StudioArticle & { description: string; body: string; contentType: string; visibility: string; section: { title: string; slug: string }; articleSources: unknown[]; versions: unknown[] };

function PipelineBadge({ status, reviewStatus }: { status: string; reviewStatus: string }) {
  const statusColors: Record<string, string> = {
    "PUBLISHED": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "ARCHIVED": "bg-gray-50 text-gray-500 border-gray-200",
    "DRAFT": "bg-gray-50 text-gray-500 border-gray-200",
    "IN_REVIEW": "bg-blue-50 text-blue-700 border-blue-200",
    "CHANGES_REQUESTED": "bg-amber-50 text-amber-700 border-amber-200",
    "APPROVED": "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const reviewLabel = reviewStatus ? reviewStatus.replaceAll("_", " ") : "";
  const combined = reviewStatus ? `${status} / ${reviewLabel}` : status;
  const color = reviewStatus ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : statusColors[status] ?? "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>{combined}</span>;
}

export function StudioWorkspace({ sections, canCreate, canEdit }: { sections: StudioSection[]; canCreate: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(sections[0]?.articles[0]?.id ?? "");
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [template, setTemplate] = useState<"FAQ" | "ISSUE_SOLUTION" | "POLICY">("FAQ");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function handleReview(action: "submit" | "approve" | "request_changes") {
    if (!selectedId || !article) return;
    setBusy(true);
    try {
      const payload = { action, note: "" };
      const response = await fetch(`/api/admin/articles/${selectedId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Action failed.");
        return;
      }
      setArticle((prev) => prev ? { ...prev, reviewStatus: data.article.reviewStatus } : prev);
      setMessage(`Article ${action}d.`);
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function publishArticle() {
    if (!selectedId || !article) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/articles/${selectedId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: new Date() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Publish failed.");
        return;
      }
      setArticle((prev) => prev ? { ...prev, status: "PUBLISHED" } : prev);
      setMessage("Article published to portal.");
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = article?.status === "DRAFT" && article.validationStatus !== "DRAFT";
  const canApprove = article?.reviewStatus === "IN_REVIEW";
  const canRequestChanges = article?.reviewStatus === "CHANGES_REQUESTED";
  const canPublish = article?.reviewStatus === "APPROVED" && article.articleSources.length > 0;
  const isPublished = article?.status === "PUBLISHED";

  return <section className="studio-shell">
    <aside className="studio-rail">
      <div className="studio-rail-head">
        <div>
          <span className="eyebrow">Knowledge map</span>
          <strong>{sections.reduce((total, section) => total + section.articles.length, 0)} items</strong>
        </div>
        <label>
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an item…" />
        </label>
      </div>
      <div className="studio-tree">
        {filtered.map((section) => (
          <details key={section.id} open>
            <summary>
              {section.title}
              <span>{section.articles.length}</span>
            </summary>
            {section.articles.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <button key={item.id} className={isSelected ? "active" : ""} onClick={() => selectArticle(item.id)}>
                  <FileText size={14} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.status === "PUBLISHED" ? <span className="text-emerald-600">Published</span> : item.status === "ARCHIVED" ? <span className="text-gray-400">Archived</span> : <PipelineBadge status={item.status} reviewStatus={item.reviewStatus} />}</small>
                  </span>
                </button>
              );
            })}
          </details>
        ))}
      </div>
    </aside>
    <div className="studio-stage">
      <header className="studio-toolbar">
        <div>
          <span className="eyebrow">Live workspace</span>
          <strong className="overflow-hidden text-ellipsis">{article?.title ?? "Select knowledge from the rail"}</strong>
        </div>
        <div className="studio-actions">
          <div className="studio-devices">
            <button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} title="Desktop preview">
              <Monitor size={16} />
            </button>
            <button className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} title="Tablet preview">
              <Tablet size={16} />
            </button>
            <button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} title="Mobile preview">
              <Smartphone size={16} />
            </button>
          </div>
          {canCreate && (
            <>
              <Link className="studio-new-link" href="/admin/articles/new">
                <FilePlus2 size={15} /> New knowledge
              </Link>
              <div className="studio-template-action">
                <select value={template} onChange={(event) => setTemplate(event.target.value as typeof template)} aria-label="Quick knowledge template">
                  <option value="FAQ">FAQ</option>
                  <option value="ISSUE_SOLUTION">Issue solution</option>
                  <option value="POLICY">Policy</option>
                </select>
                <button onClick={createFromTemplate}>Quick draft</button>
              </div>
            </>
          )}
          {canCreate && <button onClick={cloneArticle} disabled={!selectedId}><Copy size={15} /> Clone draft</button>}
          {canEdit && selectedId && <Link href={`/admin/articles/${selectedId}`}><ExternalLink size={15} /> Open editor</Link>}
          {article && !isPublished && canSubmit && (
            <button onClick={() => handleReview("submit")} disabled={busy} className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Submit for review
            </button>
          )}
          {article && (canApprove || canRequestChanges) && (
            <button onClick={() => handleReview(article.reviewStatus === "CHANGES_REQUESTED" ? "request_changes" : "approve")} disabled={busy} className="px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <CheckCircle size={13} /> {article.reviewStatus === "CHANGES_REQUESTED" ? "Request changes" : "Approve for publish"}
            </button>
          )}
          {article && canPublish && (
            <button onClick={publishArticle} disabled={busy} className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <Hash size={13} /> Publish to portal
            </button>
          )}
        </div>
      </header>
      <div className={`studio-preview ${device}`}>
        {article ? (
          <article className="studio-document">
            <div className="eyebrow">{article.section.title} · {article.contentType.toLowerCase().replaceAll("_", " ")}</div>
            <h1>{article.title}</h1>
            <p className="studio-lead">{article.description}</p>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
          </article>
        ) : (
          <div className="studio-placeholder">
            <FileText size={38} />
            <h2>Studio is ready</h2>
            <p>Select an item to inspect its rendered document, clone it into a safe draft, or open the full editor.</p>
          </div>
        )}
      </div>
      <aside className="studio-inspector">
        <div>
          <span className="eyebrow">Inspector</span>
          <h2>Readiness</h2>
        </div>
        {article ? (
          <>
            <dl>
              <div>
                <dt>Status</dt>
                <dd><PipelineBadge status={article.status} reviewStatus={article.reviewStatus} /></dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>{article.visibility}</dd>
              </div>
              <div>
                <dt>Validation</dt>
                <dd>{article.validationStatus.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Review</dt>
                <dd>{article.reviewStatus ? <PipelineBadge status={article.reviewStatus} reviewStatus={article.reviewStatus} /> : "—"}</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>{article.articleSources.length}</dd>
              </div>
              <div>
                <dt>Revisions</dt>
                <dd>{article.versions.length}</dd>
              </div>
            </dl>
            <div className="studio-checklist">
              <strong>Publication checks</strong>
              <span className={article.articleSources.length ? "done" : ""}>Evidence source attached</span>
              <span className={article.validationStatus !== "DRAFT" ? "done" : ""}>Technical review complete</span>
              <span className={article.reviewStatus === "APPROVED" ? "done" : ""}>Knowledge review approved</span>
              <span className={article.status === "PUBLISHED" ? "done" : ""}>Published release</span>
            </div>
          </>
        ) : (
          <p>Document metadata and publication readiness appear here.</p>
        )}
      </aside>
    </div>
    </section>;
  }
