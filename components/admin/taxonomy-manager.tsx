"use client";

import { FormEvent, useState } from "react";
import { FolderPlus, Save, Tag, Tags, Trash2 } from "lucide-react";

type Section = { id: string; slug: string; title: string; summary: string; icon: string; order: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; _count: { articles: number } };
type TagItem = { id: string; slug: string; name: string; _count: { articleTags: number } };

export function TaxonomyManager({ initialSections, initialTags, canManage }: { initialSections: Section[]; initialTags: TagItem[]; canManage: boolean }) {
  const [sections, setSections] = useState(initialSections);
  const [tags, setTags] = useState(initialTags);
  const [message, setMessage] = useState<string | null>(null);

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: form.get("slug"), title: form.get("title"), summary: form.get("summary"), icon: form.get("icon"), order: Number(form.get("order")), status: form.get("status") }) });
    const result = (await response.json()) as { section?: Section; error?: string };
    if (response.ok && result.section) { setSections((current) => [...current, { ...result.section!, _count: { articles: 0 } }].toSorted((a, b) => a.order - b.order)); event.currentTarget.reset(); setMessage("Section created."); } else setMessage(result.error ?? "Could not create the section.");
  }

  async function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: form.get("slug"), name: form.get("name") }) });
    const result = (await response.json()) as { tag?: TagItem; error?: string };
    if (response.ok && result.tag) { setTags((current) => [...current, { ...result.tag!, _count: { articleTags: 0 } }].toSorted((a, b) => a.name.localeCompare(b.name))); event.currentTarget.reset(); setMessage("Tag created."); } else setMessage(result.error ?? "Could not create the tag.");
  }

  function setSection<K extends keyof Section>(id: string, key: K, value: Section[K]) { setSections((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item)); }
  function setTag<K extends keyof TagItem>(id: string, key: K, value: TagItem[K]) { setTags((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item)); }
  async function saveSection(section: Section) { const response = await fetch(`/api/admin/sections/${section.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: section.slug, title: section.title, summary: section.summary, icon: section.icon, order: section.order, status: section.status }) }); const result = await response.json(); setMessage(response.ok ? "Section updated." : result.error ?? "Section update failed."); }
  async function deleteSection(section: Section) { if (!window.confirm(`Delete empty section ${section.title}?`)) return; const response = await fetch(`/api/admin/sections/${section.id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) return setMessage(result.error ?? "Section deletion failed."); setSections((items) => items.filter((item) => item.id !== section.id)); setMessage("Section deleted."); }
  async function saveTag(tag: TagItem) { const response = await fetch(`/api/admin/tags/${tag.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: tag.slug, name: tag.name }) }); const result = await response.json(); setMessage(response.ok ? "Tag updated." : result.error ?? "Tag update failed."); }
  async function deleteTag(tag: TagItem) { if (!window.confirm(`Delete tag ${tag.name} and detach it from ${tag._count.articleTags} article(s)?`)) return; const response = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) return setMessage(result.error ?? "Tag deletion failed."); setTags((items) => items.filter((item) => item.id !== tag.id)); setMessage("Tag deleted."); }

  return <div className="admin-taxonomy-layout">
    {canManage && <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><FolderPlus size={18} /> New section</h2><p>Sections determine public navigation and guide ownership.</p></div><form onSubmit={createSection}><label>Title<input name="title" required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label>Summary<textarea name="summary" rows={3} minLength={10} required /></label><label>Icon identifier<input name="icon" defaultValue="book" required /></label><label>Order<input name="order" type="number" min={1} defaultValue={sections.length + 1} required /></label><label>Status<select name="status" defaultValue="DRAFT"><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label><button className="admin-primary-button">Create section</button></form></section>}
    {canManage && <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Tag size={18} /> New tag</h2><p>Tags improve search and relationship discovery.</p></div><form onSubmit={createTag}><label>Name<input name="name" required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><button className="admin-primary-button">Create tag</button></form></section>}
    <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>Sections</h2></div><table className="admin-table"><thead><tr><th>Order</th><th>Section</th><th>Status</th><th>Guides</th><th>Actions</th></tr></thead><tbody>{sections.map((section) => <tr key={section.id}><td><input disabled={!canManage} type="number" value={section.order} onChange={(event) => setSection(section.id, "order", Number(event.target.value))} /></td><td><input disabled={!canManage} value={section.title} onChange={(event) => setSection(section.id, "title", event.target.value)} /><input disabled={!canManage} value={section.slug} onChange={(event) => setSection(section.id, "slug", event.target.value)} /><textarea disabled={!canManage} value={section.summary} onChange={(event) => setSection(section.id, "summary", event.target.value)} /></td><td><select disabled={!canManage} value={section.status} onChange={(event) => setSection(section.id, "status", event.target.value as Section["status"])}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></td><td>{section._count.articles}</td><td>{canManage && <div className="admin-row-actions"><button type="button" onClick={() => saveSection(section)}><Save size={15} /> Save</button><button className="admin-danger-button" type="button" onClick={() => deleteSection(section)}><Trash2 size={15} /> Delete</button></div>}</td></tr>)}</tbody></table></section>
    <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2><Tags size={18} /> Tags</h2></div><table className="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Articles</th><th>Actions</th></tr></thead><tbody>{tags.map((tag) => <tr key={tag.id}><td><input disabled={!canManage} value={tag.name} onChange={(event) => setTag(tag.id, "name", event.target.value)} /></td><td><input disabled={!canManage} value={tag.slug} onChange={(event) => setTag(tag.id, "slug", event.target.value)} /></td><td>{tag._count.articleTags}</td><td>{canManage && <div className="admin-row-actions"><button type="button" onClick={() => saveTag(tag)}><Save size={15} /> Save</button><button className="admin-danger-button" type="button" onClick={() => deleteTag(tag)}><Trash2 size={15} /> Delete</button></div>}</td></tr>)}</tbody></table>{message && <p className="admin-manager-message" role="status">{message}</p>}</section>
  </div>;
}
