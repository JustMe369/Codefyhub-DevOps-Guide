"use client";

import { useState } from "react";
import { CheckCircle2, Save, Send } from "lucide-react";

type EditableArticle = {
  id: string;
  sectionId: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  difficulty: "FOUNDATION" | "INTERMEDIATE" | "ADVANCED";
  contentType: "CONCEPT" | "HOW_TO" | "RUNBOOK" | "REFERENCE" | "CONFIGURATION_RECIPE" | "LEARNING_PATH";
  validationStatus: "DRAFT" | "SOURCE_REVIEWED" | "LAB_TESTED";
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
  updatedAt: string;
  status: string;
};

type SectionOption = { id: string; title: string };

const listToText = (values: string[]) => values.join("\n");
const textToList = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export function ArticleEditor({ initialArticle, sections, sourceCount }: { initialArticle: EditableArticle; sections: SectionOption[]; sourceCount: number }) {
  const [article, setArticle] = useState(initialArticle);
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
        },
      }),
    });
    const result = (await response.json()) as { article?: EditableArticle; error?: string };
    if (!response.ok || !result.article) setError(result.error ?? "Save failed.");
    else {
      setArticle((current) => ({ ...current, updatedAt: result.article!.updatedAt }));
      setChangeSummary("");
      setMessage("Saved as a new immutable revision.");
    }
    setPending(false);
  }

  async function publish() {
    setPending(true);
    setError(null);
    setMessage(null);
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
    setPending(false);
  }

  return (
    <div className="admin-editor-grid">
      <section className="admin-panel admin-editor-main">
        <label>Title<input value={article.title} onChange={(event) => setField("title", event.target.value)} /></label>
        <label>Description<textarea rows={3} value={article.description} onChange={(event) => setField("description", event.target.value)} /></label>
        <label>Markdown body<textarea className="admin-code-editor" rows={28} value={article.body} onChange={(event) => setField("body", event.target.value)} /></label>
      </section>
      <aside className="admin-panel admin-editor-meta">
        <div className="admin-status-line"><span className={`admin-status ${article.status.toLowerCase()}`}>{article.status}</span><span>{sourceCount} source{sourceCount === 1 ? "" : "s"}</span></div>
        <label>Section<select value={article.sectionId} onChange={(event) => setField("sectionId", event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
        <label>Slug<input value={article.slug} onChange={(event) => setField("slug", event.target.value)} /></label>
        <label>Content type<select value={article.contentType} onChange={(event) => setField("contentType", event.target.value as EditableArticle["contentType"])}>{["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Difficulty<select value={article.difficulty} onChange={(event) => setField("difficulty", event.target.value as EditableArticle["difficulty"])}>{["FOUNDATION", "INTERMEDIATE", "ADVANCED"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Validation<select value={article.validationStatus} onChange={(event) => setField("validationStatus", event.target.value as EditableArticle["validationStatus"])}>{["DRAFT", "SOURCE_REVIEWED", "LAB_TESTED"].map((value) => <option key={value}>{value}</option>)}</select></label>
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
        <label>Change summary<input value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} placeholder="What changed and why" /></label>
        {message && <p className="admin-success"><CheckCircle2 size={16} /> {message}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-editor-actions">
          <button type="button" onClick={save} disabled={pending || changeSummary.trim().length < 3}><Save size={16} /> Save revision</button>
          <button type="button" className="admin-primary-button" onClick={publish} disabled={pending || article.validationStatus === "DRAFT" || sourceCount === 0}><Send size={16} /> Publish</button>
        </div>
      </aside>
    </div>
  );
}
