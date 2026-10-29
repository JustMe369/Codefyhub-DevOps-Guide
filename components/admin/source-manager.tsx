"use client";

import { FormEvent, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

type Source = { id: string; title: string; organization: string; url: string; sourceType: string; lastVerifiedAt: string; verifiedBy: string; _count: { articleSources: number } };

export function SourceManager({ initialSources, canManage }: { initialSources: Source[]; canManage: boolean }) {
  const [sources, setSources] = useState(initialSources);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const response = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), organization: form.get("organization"), url: form.get("url"), sourceType: form.get("sourceType"), accessedAt: now, lastVerifiedAt: now, verifiedBy: form.get("verifiedBy") }),
    });
    const result = (await response.json()) as { source?: Source; error?: string };
    if (response.ok && result.source) {
      setSources((current) => [...current, { ...result.source!, _count: { articleSources: 0 } }].toSorted((a, b) => a.organization.localeCompare(b.organization) || a.title.localeCompare(b.title)));
      event.currentTarget.reset();
      setMessage("Source created. Attach it to a guide from the article editor.");
    } else setMessage(result.error ?? "Could not create the source.");
    setPending(false);
  }

  function setSource<K extends keyof Source>(id: string, key: K, value: Source[K]) { setSources((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item)); }

  async function saveSource(source: Source) {
    const response = await fetch(`/api/admin/sources/${source.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: source.title, organization: source.organization, url: source.url, sourceType: source.sourceType, lastVerifiedAt: source.lastVerifiedAt, verifiedBy: source.verifiedBy }) });
    const result = await response.json();
    setMessage(response.ok ? "Source updated." : result.error ?? "Source update failed.");
  }

  async function deleteSource(source: Source) {
    if (!window.confirm(`Delete ${source.title} and detach it from ${source._count.articleSources} article(s)?`)) return;
    const response = await fetch(`/api/admin/sources/${source.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Source deletion failed.");
    setSources((items) => items.filter((item) => item.id !== source.id));
    setMessage("Source deleted.");
  }

  return <div className="admin-manager-grid">
    {canManage && <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Plus size={18} /> Add authority</h2><p>Use first-party or otherwise accountable technical sources.</p></div><form onSubmit={addSource}><label>Title<input name="title" required minLength={3} /></label><label>Organization<input name="organization" required minLength={2} /></label><label>Canonical URL<input name="url" type="url" required /></label><label>Source type<input name="sourceType" defaultValue="Official documentation" required /></label><label>Verified by<input name="verifiedBy" defaultValue="Codefyhub Editorial Team" required /></label><button className="admin-primary-button" disabled={pending}><Save size={16} /> Add source</button></form></section>}
    <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Authority</th><th>Type</th><th>Used by</th><th>Verified</th><th>Actions</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id}><td><input aria-label="Organization" disabled={!canManage} value={source.organization} onChange={(event) => setSource(source.id, "organization", event.target.value)} /><input aria-label="Source title" disabled={!canManage} value={source.title} onChange={(event) => setSource(source.id, "title", event.target.value)} /><input aria-label="Source URL" disabled={!canManage} value={source.url} onChange={(event) => setSource(source.id, "url", event.target.value)} /></td><td><input disabled={!canManage} value={source.sourceType} onChange={(event) => setSource(source.id, "sourceType", event.target.value)} /></td><td>{source._count.articleSources} guides</td><td><input aria-label="Verified by" disabled={!canManage} value={source.verifiedBy} onChange={(event) => setSource(source.id, "verifiedBy", event.target.value)} /><input aria-label="Last verified" disabled={!canManage} type="date" value={source.lastVerifiedAt.slice(0, 10)} onChange={(event) => setSource(source.id, "lastVerifiedAt", new Date(`${event.target.value}T00:00:00.000Z`).toISOString())} /></td><td>{canManage && <div className="admin-row-actions"><button type="button" onClick={() => saveSource(source)}><Save size={15} /> Save</button><button className="admin-danger-button" type="button" onClick={() => deleteSource(source)}><Trash2 size={15} /> Delete</button></div>}</td></tr>)}</tbody></table>{message && <p className="admin-manager-message" role="status">{message}</p>}</section>
  </div>;
}
