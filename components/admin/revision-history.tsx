"use client";

import { useState } from "react";
import { Eye, History, RotateCcw } from "lucide-react";

type Revision = { revision: number; body: string; changeSummary: string; createdAt: string; createdBy?: { name: string; email: string } | null };

export function RevisionHistory({ articleId, expectedUpdatedAt, currentBody, revisions }: { articleId: string; expectedUpdatedAt: string; currentBody: string; revisions: Revision[] }) {
  const [selected, setSelected] = useState<Revision | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(revision: Revision) {
    const summary = `Restore revision ${revision.revision}: ${revision.changeSummary}`.slice(0, 240);
    setPending(revision.revision);
    setError(null);
    const response = await fetch(`/api/admin/articles/${articleId}/versions/${revision.revision}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt, changeSummary: summary }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Restore failed.");
      setPending(null);
      return;
    }
    setMessage(`Revision ${revision.revision} restored as a new revision.`);
    window.location.reload();
  }

  return (
    <section className="admin-panel admin-revision-panel">
      <div className="admin-panel-heading"><div><h2><History size={18} /> Revision history</h2><p>Compare a prior body with the current draft, then restore it as a new immutable revision.</p></div></div>
      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-revision-list">
        {revisions.map((revision) => <article key={revision.revision}>
          <div><strong>Revision {revision.revision}</strong><span>{revision.changeSummary}</span><small>{new Date(revision.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })} · {revision.createdBy?.name ?? "Automated import"}</small></div>
          <div className="admin-revision-actions"><button type="button" onClick={() => setSelected(revision)}><Eye size={15} /> Compare</button><button type="button" onClick={() => restore(revision)} disabled={pending !== null}><RotateCcw size={15} /> Restore</button></div>
        </article>)}
      </div>
      {selected && <div className="admin-compare" role="dialog" aria-modal="true" aria-label={`Compare revision ${selected.revision}`}>
        <div className="admin-compare-heading"><strong>Current draft compared with revision {selected.revision}</strong><button type="button" onClick={() => setSelected(null)}>Close</button></div>
        <div><pre>{currentBody}</pre><pre>{selected.body}</pre></div>
      </div>}
    </section>
  );
}
