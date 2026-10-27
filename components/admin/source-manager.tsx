"use client";

import { FormEvent, useState } from "react";
import { Plus, Save } from "lucide-react";

type Source = { id: string; title: string; organization: string; url: string; sourceType: string; lastVerifiedAt: string; verifiedBy: string; _count: { articleSources: number } };

export function SourceManager({ initialSources }: { initialSources: Source[] }) {
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

  return <div className="admin-manager-grid">
    <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Plus size={18} /> Add authority</h2><p>Use first-party or otherwise accountable technical sources.</p></div><form onSubmit={addSource}><label>Title<input name="title" required minLength={3} /></label><label>Organization<input name="organization" required minLength={2} /></label><label>Canonical URL<input name="url" type="url" required /></label><label>Source type<input name="sourceType" defaultValue="Official documentation" required /></label><label>Verified by<input name="verifiedBy" defaultValue="Codefyhub Editorial Team" required /></label><button className="admin-primary-button" disabled={pending}><Save size={16} /> Add source</button>{message && <p className={message.startsWith("Source created") ? "admin-success" : "admin-error"}>{message}</p>}</form></section>
    <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Authority</th><th>Type</th><th>Used by</th><th>Last verified</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id}><td><a href={source.url} target="_blank" rel="noreferrer">{source.organization}: {source.title}</a></td><td>{source.sourceType}</td><td>{source._count.articleSources} guides</td><td>{new Date(source.lastVerifiedAt).toLocaleDateString("en", { dateStyle: "medium" })}</td></tr>)}</tbody></table></section>
  </div>;
}
