"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, GripVertical, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import type { HeaderMenuItem } from "@/lib/site-navigation";

export function NavigationManager({ initialItems }: { initialItems: HeaderMenuItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateItem<K extends keyof HeaderMenuItem>(id: string, key: K, value: HeaderMenuItem[K]) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function addItem() {
    if (items.length >= 12) return setError("The header supports up to 12 menu items.");
    setItems((current) => [...current, { id: crypto.randomUUID(), label: "New link", href: "/", visible: true, featured: false, newTab: false }]);
    setError(null);
  }

  async function save() {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/navigation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(items) });
      const result = await response.json() as { error?: string };
      if (!response.ok) setError(result.error ?? "The header menu could not be saved.");
      else setMessage("Header navigation saved. The public menu now uses this configuration.");
    } catch {
      setError("The save request could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  const visibleItems = items.filter((item) => item.visible);

  return <div className="navigation-manager-layout">
    <section className="admin-panel navigation-preview-panel">
      <div className="admin-panel-heading"><div><h2><Sparkles size={18} /> Live menu preview</h2><p>Hidden links remain editable below but disappear from this preview.</p></div><span>{visibleItems.length} visible</span></div>
      <div className="navigation-preview" aria-label="Header navigation preview">
        <strong>Codefyhub <b>DevOps</b></strong>
        <nav>{visibleItems.length ? visibleItems.map((item) => <span className={item.featured ? "featured" : ""} key={item.id}>{item.label}{item.newTab && <ExternalLink size={12} />}</span>) : <em>No menu items are currently visible.</em>}</nav>
        <span className="navigation-preview-search">Search…</span>
      </div>
    </section>

    <section className="admin-panel navigation-editor-panel">
      <div className="admin-panel-heading"><div><h2>Menu items</h2><p>Use secure external URLs or internal paths beginning with <code>/</code>.</p></div><button type="button" className="admin-secondary-button navigation-add-button" onClick={addItem}><Plus size={16} /> Add item</button></div>
      <div className="navigation-item-list">
        {items.map((item, index) => <article className={item.visible ? "" : "hidden-item"} key={item.id}>
          <div className="navigation-item-order"><GripVertical size={18} /><strong>{index + 1}</strong><button type="button" aria-label={`Move ${item.label} up`} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUp size={15} /></button><button type="button" aria-label={`Move ${item.label} down`} disabled={index === items.length - 1} onClick={() => moveItem(index, 1)}><ArrowDown size={15} /></button></div>
          <div className="navigation-item-fields"><label>Label<input value={item.label} maxLength={40} onChange={(event) => updateItem(item.id, "label", event.target.value)} /></label><label>Destination<input value={item.href} maxLength={500} onChange={(event) => updateItem(item.id, "href", event.target.value)} /></label></div>
          <div className="navigation-item-options">
            <label><input type="checkbox" checked={item.visible} onChange={(event) => updateItem(item.id, "visible", event.target.checked)} /> {item.visible ? <Eye size={14} /> : <EyeOff size={14} />} Visible</label>
            <label><input type="checkbox" checked={item.featured} onChange={(event) => updateItem(item.id, "featured", event.target.checked)} /> <Sparkles size={14} /> Featured</label>
            <label><input type="checkbox" checked={item.newTab} onChange={(event) => updateItem(item.id, "newTab", event.target.checked)} /> <ExternalLink size={14} /> New tab</label>
            <button type="button" className="navigation-remove-button" onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}><Trash2 size={15} /> Remove</button>
          </div>
        </article>)}
      </div>
      {message && <p className="admin-success" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="navigation-save-bar"><span>{items.length} total · {visibleItems.length} visible</span><button type="button" className="admin-primary-button" disabled={pending} onClick={save}><Save size={16} /> {pending ? "Saving…" : "Save header menu"}</button></div>
    </section>
  </div>;
}
