"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Pencil, Save, Trash2, X } from "lucide-react";

export type ManagedSection = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  icon: string;
  order: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  _count?: { articles: number };
};

type FormState = Omit<ManagedSection, "id" | "_count">;
const emptyForm: FormState = { title: "", slug: "", summary: "", icon: "book-open", order: 1, status: "DRAFT" };

export function StudioSectionManager({ sections, canManage }: { sections: ManagedSection[]; canManage: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function edit(section: ManagedSection) {
    setEditingId(section.id);
    setForm({ title: section.title, slug: section.slug, summary: section.summary, icon: section.icon, order: section.order, status: section.status });
    setMessage("");
  }

  function reset() {
    setEditingId(null);
    setForm({ ...emptyForm, order: sections.length + 1 });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(editingId ? `/api/admin/sections/${editingId}` : "/api/admin/sections", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, order: Number(form.order) }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Could not save section."); return; }
      setMessage(editingId ? "Section updated." : "Section created.");
      reset();
      router.refresh();
    } catch {
      setMessage("Network error. Please try again.");
    } finally { setBusy(false); }
  }

  async function remove(section: ManagedSection) {
    if (!window.confirm(`Delete “${section.title}”? Sections with articles cannot be deleted. You can archive a section instead.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sections/${section.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Could not delete section."); return; }
      setMessage("Section deleted.");
      if (editingId === section.id) reset();
      router.refresh();
    } catch {
      setMessage("Network error. Please try again.");
    } finally { setBusy(false); }
  }

  return <details className="studio-section-manager" open={false}>
    <summary><span><strong>Section management</strong><small>{sections.length} sections · create, edit, order, publish, archive, or delete</small></span>{canManage && <span className="studio-section-add"><FolderPlus size={15} /> Manage sections</span>}</summary>
    <div className="studio-section-manager-body">
      <div className="studio-section-list">
        {sections.map((section) => <article key={section.id} className="studio-section-card">
          <div><span className="studio-section-icon">{section.icon}</span><div><strong>{section.title}</strong><small>/{section.slug} · position {section.order} · {section._count?.articles ?? 0} articles</small></div></div>
          <span className={`admin-status ${section.status.toLowerCase()}`}>{section.status}</span>
          {canManage && <div className="studio-section-card-actions"><button type="button" disabled={busy} onClick={() => edit(section)} aria-label={`Edit ${section.title}`}><Pencil size={14} /> Edit</button><button type="button" disabled={busy} onClick={() => remove(section)} aria-label={`Delete ${section.title}`}><Trash2 size={14} /> Delete</button></div>}
        </article>)}
        {!sections.length && <p>No sections yet. Create one to organize studio content.</p>}
      </div>
      {canManage && <form className="studio-section-form" onSubmit={save}>
        <div className="studio-section-form-heading"><div><span className="eyebrow">{editingId ? "Section settings" : "New section"}</span><h3>{editingId ? "Edit section" : "Create a section"}</h3></div>{editingId && <button type="button" onClick={reset} aria-label="Cancel editing"><X size={16} /></button>}</div>
        <label>Title<input required minLength={2} maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /><small>Lowercase letters, numbers, and hyphens</small></label>
        <label>Summary<textarea required minLength={10} maxLength={500} rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
        <div className="studio-section-form-grid"><label>Icon key<input required maxLength={80} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label><label>Display order<input required type="number" min={1} max={10000} value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></label></div>
        <label>Visibility<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
        <button className="admin-primary-button" disabled={busy} type="submit"><Save size={15} /> {busy ? "Saving…" : editingId ? "Save changes" : "Create section"}</button>
      </form>}
      {message && <p className="studio-section-message" role="status">{message}</p>}
    </div>
  </details>;
}
