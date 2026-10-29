"use client";

import { useState } from "react";
import { Building2, Plus, Save, Trash2 } from "lucide-react";

type Company = { id: string; name: string; slug: string; status: "ACTIVE" | "SUSPENDED"; isPublic: boolean; _count: { memberships: number; articles: number; sections: number } };

export function CompanyManager({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), slug: data.get("slug"), isPublic: data.get("isPublic") === "on" }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Company creation failed.");
    setCompanies((items) => [...items, { ...payload.company, _count: { memberships: 0, articles: 0, sections: 0 } }].toSorted((a, b) => a.name.localeCompare(b.name)));
    form.reset();
    setMessage("Company workspace created with protected system roles.");
  }

  function setCompany<K extends keyof Company>(id: string, key: K, value: Company[K]) {
    setCompanies((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  async function saveCompany(company: Company) {
    setPendingId(company.id);
    const response = await fetch(`/api/admin/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: company.name, slug: company.slug, status: company.status, isPublic: company.isPublic }) });
    const payload = await response.json();
    setPendingId(null);
    if (!response.ok) return setMessage(payload.error ?? "Company update failed.");
    setCompanies((items) => items.map((item) => item.id === company.id ? { ...item, ...payload.company } : item));
    setMessage("Company settings updated.");
  }

  async function deleteCompany(company: Company) {
    const confirmation = window.prompt(`Permanent deletion removes all members, sections, articles, sources, roles, and audit records for this company. Type ${company.slug} to continue.`);
    if (confirmation !== company.slug || !window.confirm(`Permanently delete ${company.name}? This cannot be undone.`)) return;
    setPendingId(company.id);
    const response = await fetch(`/api/admin/companies/${company.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmSlug: confirmation, permanent: true }) });
    const payload = await response.json();
    setPendingId(null);
    if (!response.ok) return setMessage(payload.error ?? "Company deletion failed.");
    setCompanies((items) => items.filter((item) => item.id !== company.id));
    setMessage("Company and its isolated data were permanently deleted.");
  }

  return <div className="admin-manager-grid">
    <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Plus size={18} /> New company</h2><p>Create an isolated knowledge workspace and its default role system.</p></div><form onSubmit={createCompany}><label>Company name<input name="name" required minLength={2} /></label><label>Workspace slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label><label className="admin-check"><input name="isPublic" type="checkbox" /> Allow explicitly public knowledge</label><button className="admin-primary-button">Create company</button></form></section>
    <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>Company administration</h2><p>Edit every workspace or permanently remove its isolated data.</p></div><table className="admin-table"><thead><tr><th>Company</th><th>Status</th><th>Data</th><th>Exposure</th><th>Actions</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><label><span className="sr-only">Company name</span><input value={company.name} onChange={(event) => setCompany(company.id, "name", event.target.value)} /></label><label><span className="sr-only">Company slug</span><input value={company.slug} onChange={(event) => setCompany(company.id, "slug", event.target.value)} /></label></td><td><select aria-label={`Status for ${company.name}`} value={company.status} onChange={(event) => setCompany(company.id, "status", event.target.value as Company["status"])}><option>ACTIVE</option><option>SUSPENDED</option></select></td><td><strong><Building2 size={15} /> {company._count.memberships} members</strong><span>{company._count.sections} spaces · {company._count.articles} items</span></td><td><label className="admin-check"><input type="checkbox" checked={company.isPublic} onChange={(event) => setCompany(company.id, "isPublic", event.target.checked)} /> Public enabled</label></td><td><div className="admin-row-actions"><button type="button" disabled={pendingId === company.id} onClick={() => saveCompany(company)}><Save size={15} /> Save</button><button className="admin-danger-button" type="button" disabled={pendingId === company.id} onClick={() => deleteCompany(company)}><Trash2 size={15} /> Delete</button></div></td></tr>)}</tbody></table></section>
    {message && <p className="admin-manager-message" role="status">{message}</p>}
  </div>;
}
