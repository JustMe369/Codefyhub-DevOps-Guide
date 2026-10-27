"use client";

import { FormEvent, useState } from "react";
import { FolderPlus, Tag, Tags } from "lucide-react";

type Section = { id: string; slug: string; title: string; summary: string; icon: string; order: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; _count: { articles: number } };
type TagItem = { id: string; slug: string; name: string; _count: { articleTags: number } };

export function TaxonomyManager({ initialSections, initialTags }: { initialSections: Section[]; initialTags: TagItem[] }) {
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

  return <div className="admin-taxonomy-layout">
    <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><FolderPlus size={18} /> New section</h2><p>Sections determine public navigation and guide ownership.</p></div><form onSubmit={createSection}><label>Title<input name="title" required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label>Summary<textarea name="summary" rows={3} minLength={10} required /></label><label>Icon identifier<input name="icon" defaultValue="book" required /></label><label>Order<input name="order" type="number" min={1} defaultValue={sections.length + 1} required /></label><label>Status<select name="status" defaultValue="DRAFT"><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label><button className="admin-primary-button">Create section</button></form></section>
    <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Tag size={18} /> New tag</h2><p>Tags improve search and relationship discovery.</p></div><form onSubmit={createTag}><label>Name<input name="name" required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><button className="admin-primary-button">Create tag</button></form>{message && <p className={message.endsWith("created.") ? "admin-success" : "admin-error"}>{message}</p>}</section>
    <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>Sections</h2></div><table className="admin-table"><thead><tr><th>Order</th><th>Section</th><th>Status</th><th>Guides</th></tr></thead><tbody>{sections.map((section) => <tr key={section.id}><td>{section.order}</td><td><strong>{section.title}</strong><span>{section.slug}</span></td><td><span className={`admin-status ${section.status.toLowerCase()}`}>{section.status}</span></td><td>{section._count.articles}</td></tr>)}</tbody></table></section>
    <section className="admin-panel admin-tag-list"><div className="admin-panel-heading"><h2><Tags size={18} /> Tags</h2></div>{tags.map((tag) => <span key={tag.id}>{tag.name} <small>{tag._count.articleTags}</small></span>)}</section>
  </div>;
}
