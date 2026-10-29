"use client";

import { useState } from "react";
import { CheckCircle2, Link2, Save, Send, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type EditableArticle = {
  id: string;
  sectionId: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  difficulty: "FOUNDATION" | "INTERMEDIATE" | "ADVANCED";
  contentType: "CONCEPT" | "HOW_TO" | "RUNBOOK" | "REFERENCE" | "CONFIGURATION_RECIPE" | "LEARNING_PATH" | "FAQ" | "WORKFLOW" | "ISSUE_SOLUTION" | "POLICY";
  validationStatus: "DRAFT" | "SOURCE_REVIEWED" | "LAB_TESTED";
  reviewStatus: "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
  visibility: "PUBLIC" | "INTERNAL" | "RESTRICTED" | "DRAFT";
  applicablePlatforms: string[];
  applicableVersions: string[];
  prerequisites: string[];
  relatedGuides: string[];
  readingMinutes: number;
  order: number;
  lastVerifiedAt: string;
  verifiedBy: string;
  verificationMethod: string;
  testedVersions: string;
  testedAt: string | null;
  testEnvironment: string | null;
  reviewDueAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  expiresAt: string | null;
  updatedAt: string;
  status: string;
};

type SectionOption = { id: string; title: string };

const listToText = (values: string[]) => values.join("\n");
const textToList = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

type SourceOption = { id: string; title: string; organization: string };
type TagOption = { id: string; name: string };

export function ArticleEditor({ initialArticle, sections, sources, tags, initialSourceIds, initialTagIds, canReview, canPublish, isPlatformAdmin }: { initialArticle: EditableArticle; sections: SectionOption[]; sources: SourceOption[]; tags: TagOption[]; initialSourceIds: string[]; initialTagIds: string[]; canReview: boolean; canPublish: boolean; isPlatformAdmin: boolean }) {
  const router = useRouter();
  const [article, setArticle] = useState(initialArticle);
  const [sourceIds, setSourceIds] = useState(initialSourceIds);
  const [tagIds, setTagIds] = useState(initialTagIds);
  const [changeSummary, setChangeSummary] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof EditableArticle>(key: K, value: EditableArticle[K]) {
    setArticle((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
    const response = await fetch(`/api/admin/articles/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedUpdatedAt: article.updatedAt,
        changeSummary,
        data: {
          sectionId: article.sectionId,
          slug: article.slug,
          title: article.title,
          description: article.description,
          body: article.body,
          difficulty: article.difficulty,
          contentType: article.contentType,
          validationStatus: article.validationStatus,
          visibility: article.visibility,
          applicablePlatforms: article.applicablePlatforms,
          applicableVersions: article.applicableVersions,
          prerequisites: article.prerequisites,
          relatedGuides: article.relatedGuides,
          readingMinutes: article.readingMinutes,
          order: article.order,
          lastVerifiedAt: article.lastVerifiedAt,
          verifiedBy: article.verifiedBy,
          verificationMethod: article.verificationMethod,
          testedVersions: article.testedVersions,
          testedAt: article.testedAt,
          testEnvironment: article.testEnvironment,
          reviewDueAt: article.reviewDueAt,
          expiresAt: article.expiresAt,
        },
      }),
    });
    const result = (await response.json()) as { article?: EditableArticle; error?: string };
    if (!response.ok || !result.article) setError(result.error ?? "Save failed.");
    else {
      setArticle((current) => ({ ...current, ...result.article! }));
      setChangeSummary("");
      setMessage("Saved as a new immutable revision.");
    }
    } catch {
      setError("The save request could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function review(action: "submit" | "approve" | "request_changes") {
    setPending(true);
    setError(null);
    const note = action === "request_changes" ? window.prompt("Explain the required changes") ?? "" : "";
    if (action === "request_changes" && note.trim().length === 0) { setPending(false); return; }
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note, expectedUpdatedAt: article.updatedAt }) });
      const result = (await response.json()) as { article?: EditableArticle; error?: string };
      if (!response.ok || !result.article) setError(result.error ?? "Review action failed.");
      else { setArticle((current) => ({ ...current, ...result.article! })); setMessage(action === "submit" ? "Submitted for independent review." : action === "approve" ? "Review approved. The article is ready to publish." : "Changes requested."); }
    } catch { setError("The review request could not reach the server."); }
    finally { setPending(false); }
  }

  async function publish() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
    const response = await fetch(`/api/admin/articles/${article.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: article.updatedAt }),
    });
    const result = (await response.json()) as { article?: EditableArticle; error?: string };
    if (!response.ok || !result.article) setError(result.error ?? "Publication failed.");
    else {
      setArticle((current) => ({ ...current, status: result.article!.status, updatedAt: result.article!.updatedAt }));
      setMessage("Article published.");
    }
    } catch {
      setError("The publication request could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function saveRelationships(kind: "sources" | "tags") {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/${kind}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "sources" ? { sourceIds } : { tagIds }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? `Could not save ${kind}.`);
      else setMessage(`${kind === "sources" ? "Sources" : "Tags"} updated.`);
    } catch {
      setError(`The ${kind} request could not reach the server.`);
    } finally {
      setPending(false);
    }
  }

  async function removeArticle(permanent: boolean) {
    const confirmTitle = permanent ? window.prompt(`Type the full article title to permanently delete it:\n${article.title}`) : undefined;
    if (permanent && confirmTitle !== article.title) return;
    if (!window.confirm(permanent ? "Permanently delete this article and every revision?" : "Archive this article and remove it from publication?")) return;
    setPending(true);
    const response = await fetch(`/api/admin/articles/${article.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permanent, confirmTitle }) });
    const result = await response.json();
    setPending(false);
    if (!response.ok) return setError(result.error ?? "Article removal failed.");
    router.replace("/admin/articles");
    router.refresh();
  }

  return (
    <div className="admin-editor-grid">
      <section className="admin-panel admin-editor-main">
        <label>Title<input value={article.title} onChange={(event) => setField("title", event.target.value)} /></label>
        <label>Description<textarea rows={3} value={article.description} onChange={(event) => setField("description", event.target.value)} /></label>
        <label>Markdown body<textarea className="admin-code-editor" rows={28} value={article.body} onChange={(event) => setField("body", event.target.value)} /></label>
      </section>
      <aside className="admin-panel admin-editor-meta">
        <div className="admin-status-line"><span className={`admin-status ${article.status.toLowerCase()}`}>{article.status}</span><span>{sourceIds.length} source{sourceIds.length === 1 ? "" : "s"}</span></div>
        <label>Section<select value={article.sectionId} onChange={(event) => setField("sectionId", event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
        <label>Slug<input value={article.slug} onChange={(event) => setField("slug", event.target.value)} /></label>
        <label>Content type<select value={article.contentType} onChange={(event) => setField("contentType", event.target.value as EditableArticle["contentType"])}>{["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH", "FAQ", "WORKFLOW", "ISSUE_SOLUTION", "POLICY"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label>Difficulty<select value={article.difficulty} onChange={(event) => setField("difficulty", event.target.value as EditableArticle["difficulty"])}>{["FOUNDATION", "INTERMEDIATE", "ADVANCED"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Validation<select value={article.validationStatus} onChange={(event) => setField("validationStatus", event.target.value as EditableArticle["validationStatus"])}>{["DRAFT", "SOURCE_REVIEWED", "LAB_TESTED"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Visibility<select value={article.visibility} onChange={(event) => setField("visibility", event.target.value as EditableArticle["visibility"])}><option value="INTERNAL">Selected workspace</option><option value="PUBLIC">Public</option><option value="DRAFT">Draft</option><option value="RESTRICTED">Restricted</option></select></label>
        <label>Review due<input type="date" value={article.reviewDueAt?.slice(0, 10) ?? ""} onChange={(event) => setField("reviewDueAt", event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString() : null)} /></label>
        <label>Expires / re-review<input type="date" value={article.expiresAt?.slice(0, 10) ?? ""} onChange={(event) => setField("expiresAt", event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString() : null)} /></label>
        <label>Reading minutes<input type="number" min={1} max={240} value={article.readingMinutes} onChange={(event) => setField("readingMinutes", Number(event.target.value))} /></label>
        <label>Order<input type="number" min={1} value={article.order} onChange={(event) => setField("order", Number(event.target.value))} /></label>
        <label>Platforms, one per line<textarea rows={3} value={listToText(article.applicablePlatforms)} onChange={(event) => setField("applicablePlatforms", textToList(event.target.value))} /></label>
        <label>Versions, one per line<textarea rows={3} value={listToText(article.applicableVersions)} onChange={(event) => setField("applicableVersions", textToList(event.target.value))} /></label>
        <label>Prerequisites, one per line<textarea rows={3} value={listToText(article.prerequisites)} onChange={(event) => setField("prerequisites", textToList(event.target.value))} /></label>
        <label>Related guides, one per line<textarea rows={3} value={listToText(article.relatedGuides)} onChange={(event) => setField("relatedGuides", textToList(event.target.value))} /></label>
        <label>Verified by<input value={article.verifiedBy} onChange={(event) => setField("verifiedBy", event.target.value)} /></label>
        <label>Verification method<textarea rows={3} value={article.verificationMethod} onChange={(event) => setField("verificationMethod", event.target.value)} /></label>
        <label>Tested versions<textarea rows={3} value={article.testedVersions} onChange={(event) => setField("testedVersions", event.target.value)} /></label>
        <label>Last verified<input type="date" value={article.lastVerifiedAt.slice(0, 10)} onChange={(event) => setField("lastVerifiedAt", new Date(`${event.target.value}T00:00:00.000Z`).toISOString())} /></label>
        <fieldset className="admin-selector"><legend><Link2 size={15} /> Sources</legend>{sources.map((source) => <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} onChange={() => setSourceIds((current) => current.includes(source.id) ? current.filter((id) => id !== source.id) : [...current, source.id])} /> {source.organization}: {source.title}</label>)}<button type="button" onClick={() => saveRelationships("sources")} disabled={pending}>Save sources</button></fieldset>
        <fieldset className="admin-selector"><legend><Tags size={15} /> Tags</legend>{tags.map((tag) => <label key={tag.id}><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => setTagIds((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])} /> {tag.name}</label>)}<button type="button" onClick={() => saveRelationships("tags")} disabled={pending}>Save tags</button></fieldset>
        <label>Change summary<input value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} placeholder="What changed and why" /></label>
        {message && <p className="admin-success"><CheckCircle2 size={16} /> {message}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        <section className="editor-publish-readiness" aria-label="Publication readiness">
          <div><strong>Publication readiness</strong><span>{article.status === "PUBLISHED" ? "Live" : "Checklist"}</span></div>
          <ul>
            <li className={article.validationStatus !== "DRAFT" ? "ready" : ""}><CheckCircle2 size={14} /> Technical source review complete</li>
            <li className={sourceIds.length > 0 ? "ready" : ""}><CheckCircle2 size={14} /> Evidence source attached</li>
            <li className={article.reviewStatus === "APPROVED" ? "ready" : ""}><CheckCircle2 size={14} /> Independent review approved</li>
            <li className={article.visibility !== "DRAFT" ? "ready" : ""}><CheckCircle2 size={14} /> Reader visibility configured</li>
            <li className={canPublish ? "ready" : ""}><CheckCircle2 size={14} /> Publish permission available</li>
          </ul>
          {article.contentType === "WORKFLOW" && <p>Workflows publish to the Company Portal. Set visibility to Selected workspace or Restricted; Draft visibility hides them from readers.</p>}
        </section>
        <div className="admin-editor-actions">
          <button type="button" onClick={save} disabled={pending || changeSummary.trim().length < 3}><Save size={16} /> Save revision</button>
          {article.reviewStatus !== "IN_REVIEW" && article.reviewStatus !== "APPROVED" && <button type="button" onClick={() => review("submit")} disabled={pending || article.validationStatus === "DRAFT" || sourceIds.length === 0}><Send size={16} /> Submit review</button>}
          {canReview && article.reviewStatus === "IN_REVIEW" && <><button type="button" onClick={() => review("request_changes")} disabled={pending}>Request changes</button><button type="button" onClick={() => review("approve")} disabled={pending}>Approve</button></>}
          {canPublish && <button type="button" className="admin-primary-button" onClick={publish} disabled={pending || article.reviewStatus !== "APPROVED" || article.validationStatus === "DRAFT" || sourceIds.length === 0 || article.visibility === "DRAFT"}><Send size={16} /> Publish</button>}
          <button type="button" className="admin-danger-button" onClick={() => removeArticle(false)} disabled={pending}><Trash2 size={16} /> Archive</button>
          {isPlatformAdmin && <button type="button" className="admin-danger-button" onClick={() => removeArticle(true)} disabled={pending}><Trash2 size={16} /> Delete permanently</button>}
        </div>
      </aside>
    </div>
  );
}
