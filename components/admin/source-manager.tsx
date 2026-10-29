"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Building2, CalendarCheck, FilePlus2, Link2, Save, Search, Trash2 } from "lucide-react";

type Source = { id: string; title: string; organization: string; url: string; sourceType: string; lastVerifiedAt: string; verifiedBy: string; _count: { articleSources: number } };

export function SourceManager({ initialSources, canManage }: { initialSources: Source[]; canManage: boolean }) {
  const [sources, setSources] = useState(initialSources);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const filteredSources = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sources;
    return sources.filter((source) => `${source.title} ${source.organization} ${source.url} ${source.sourceType} ${source.verifiedBy}`.toLowerCase().includes(normalized));
  }, [query, sources]);

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPendingId("new");
    setMessage(null);
    const now = new Date().toISOString();
    try {
      const response = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.get("title"), organization: form.get("organization"), url: form.get("url"), sourceType: form.get("sourceType"), accessedAt: now, lastVerifiedAt: now, verifiedBy: form.get("verifiedBy") }),
      });
      const result = (await response.json()) as { source?: Source; error?: string };
      if (!response.ok || !result.source) return setMessage(result.error ?? "Could not create the source.");
      setSources((current) => [...current, { ...result.source!, _count: { articleSources: 0 } }].toSorted((a, b) => a.organization.localeCompare(b.organization) || a.title.localeCompare(b.title)));
      formElement.reset();
      setMessage("Source created. Attach it to a guide from the article editor.");
    } catch {
      setMessage("The source could not be created. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  function setSource<K extends keyof Source>(id: string, key: K, value: Source[K]) {
    setSources((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  async function saveSource(source: Source) {
    if (!source.lastVerifiedAt || Number.isNaN(new Date(source.lastVerifiedAt).valueOf())) {
      setMessage("Choose a valid last-verified date before saving.");
      return;
    }
    setPendingId(source.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: source.title, organization: source.organization, url: source.url, sourceType: source.sourceType, lastVerifiedAt: new Date(source.lastVerifiedAt).toISOString(), verifiedBy: source.verifiedBy }),
      });
      const result = await response.json();
      setMessage(response.ok ? "Source updated." : result.error ?? "Source update failed.");
      if (response.ok && result.source) setSources((items) => items.map((item) => item.id === source.id ? { ...item, ...result.source, lastVerifiedAt: new Date(result.source.lastVerifiedAt).toISOString() } : item));
    } catch {
      setMessage("The source could not be saved. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteSource(source: Source) {
    if (!window.confirm(`Delete ${source.title} and detach it from ${source._count.articleSources} article(s)?`)) return;
    setPendingId(source.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/sources/${source.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Source deletion failed.");
      setSources((items) => items.filter((item) => item.id !== source.id));
      setMessage("Source deleted and detached from its linked guides.");
    } catch {
      setMessage("The source could not be deleted. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  return <div className="admin-manager-grid source-manager-grid">
    {canManage && <section className="admin-panel admin-manager-form source-create-panel">
      <div className="admin-panel-heading"><h2><FilePlus2 size={18} /> Add an authority</h2><p>Register a reliable reference before attaching it to technical guidance.</p></div>
      <form onSubmit={addSource}>
        <label>Source title<input name="title" required minLength={3} maxLength={180} placeholder="AWS IAM documentation" /></label>
        <label>Organization<input name="organization" required minLength={2} maxLength={120} placeholder="Amazon Web Services" /></label>
        <label>Canonical URL<input name="url" type="url" required maxLength={2048} placeholder="https://docs.example.com/…" /></label>
        <label>Source type<input name="sourceType" defaultValue="Official documentation" required maxLength={80} /></label>
        <label>Verified by<input name="verifiedBy" defaultValue="Codefyhub Editorial Team" required maxLength={120} /></label>
        <button className="admin-primary-button" disabled={pendingId !== null}><FilePlus2 size={16} /> {pendingId === "new" ? "Adding source…" : "Add source"}</button>
      </form>
    </section>}

    <section className="admin-panel source-library">
      <div className="admin-panel-heading source-library-heading"><div><h2>Evidence library</h2><p>{filteredSources.length} of {sources.length} reference{sources.length === 1 ? "" : "s"} · review dates and guide usage at a glance</p></div><span>{canManage ? "Editable" : "Read only"}</span></div>
      {message && <p className="admin-manager-message source-manager-message" role="status" aria-live="polite">{message}</p>}
      {sources.length > 0 && <label className="source-search"><Search size={16} /><span className="sr-only">Search sources</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, organization, URL, or type…" /></label>}
      {sources.length === 0 ? <div className="source-empty-state"><Link2 size={24} /><h3>No sources yet</h3><p>Add an accountable source, then link it to an article as evidence.</p></div> : filteredSources.length === 0 ? <div className="source-empty-state"><Search size={24} /><h3>No matching sources</h3><p>Try another title, organization, or source type.</p></div> : <div className="source-card-list">{filteredSources.map((source) => <article className="source-card" key={source.id}>
        <div className="source-card-heading"><div className="source-mark"><Building2 size={18} /></div><div><strong>{source.organization}</strong><span>{source._count.articleSources} linked guide{source._count.articleSources === 1 ? "" : "s"}</span></div><span className="source-type-badge">{source.sourceType}</span></div>
        <div className="source-fields">
          <label>Source title<input aria-label="Source title" disabled={!canManage} value={source.title} maxLength={180} onChange={(event) => setSource(source.id, "title", event.target.value)} /></label>
          <label>Organization<input aria-label="Organization" disabled={!canManage} value={source.organization} maxLength={120} onChange={(event) => setSource(source.id, "organization", event.target.value)} /></label>
          <label className="source-url-field">Canonical URL<input aria-label="Source URL" disabled={!canManage} type="url" value={source.url} maxLength={2048} onChange={(event) => setSource(source.id, "url", event.target.value)} /></label>
          <label>Source type<input aria-label="Source type" disabled={!canManage} value={source.sourceType} maxLength={80} onChange={(event) => setSource(source.id, "sourceType", event.target.value)} /></label>
          <label>Verified by<input aria-label="Verified by" disabled={!canManage} value={source.verifiedBy} maxLength={120} onChange={(event) => setSource(source.id, "verifiedBy", event.target.value)} /></label>
          <label>Last verified<input aria-label="Last verified" disabled={!canManage} type="date" required value={source.lastVerifiedAt.slice(0, 10)} onChange={(event) => setSource(source.id, "lastVerifiedAt", event.target.value)} /></label>
        </div>
        <footer className="source-card-footer"><span><CalendarCheck size={14} /> {source.lastVerifiedAt ? new Date(source.lastVerifiedAt).toLocaleDateString() : "Verification date needed"}</span>{canManage && <div className="source-card-actions"><button type="button" disabled={pendingId !== null} onClick={() => void saveSource(source)}><Save size={15} /> {pendingId === source.id ? "Saving…" : "Save changes"}</button><button className="admin-danger-button" type="button" disabled={pendingId !== null} onClick={() => void deleteSource(source)}><Trash2 size={15} /> Delete</button></div>}</footer>
      </article>)}</div>}
    </section>
  </div>;
}
