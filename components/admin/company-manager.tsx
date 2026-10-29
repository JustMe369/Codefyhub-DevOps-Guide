"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, FileImage, Plus, Save, Trash2 } from "lucide-react";

type Company = { id: string; name: string; slug: string; status: "ACTIVE" | "SUSPENDED"; isPublic: boolean; logoMimeType: string | null; logoDataUrl?: string | null; _count: { memberships: number; articles: number; sections: number } };

const maxLogoBytes = 512 * 1024;

function readLogoFile(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return Promise.reject(new Error("Choose a PNG, JPEG, or WebP image."));
  if (file.size > maxLogoBytes) return Promise.reject(new Error("Logo images must be 512 KB or smaller."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The logo file could not be read."));
    reader.onerror = () => reject(new Error("The logo file could not be read."));
    reader.readAsDataURL(file);
  });
}

export function CompanyManager({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newCompanyLogo, setNewCompanyLogo] = useState<string | null>(null);

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const logoFile = data.get("logo");
    try {
      const logoDataUrl = logoFile instanceof File && logoFile.size ? await readLogoFile(logoFile) : null;
      const response = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), slug: data.get("slug"), isPublic: data.get("isPublic") === "on", logoDataUrl }) });
      const payload = await response.json();
      if (!response.ok) return setMessage(payload.error ?? "Company creation failed.");
      setCompanies((items) => [...items, { ...payload.company, logoDataUrl: undefined, _count: { memberships: 0, articles: 0, sections: 0 } }].toSorted((a, b) => a.name.localeCompare(b.name)));
      form.reset();
      setNewCompanyLogo(null);
      setMessage("Company workspace created with protected roles and portal branding.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Company creation failed.");
    }
  }

  function setCompany<K extends keyof Company>(id: string, key: K, value: Company[K]) {
    setCompanies((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  async function saveCompany(company: Company) {
    setPendingId(company.id);
    const response = await fetch(`/api/admin/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: company.name, slug: company.slug, status: company.status, isPublic: company.isPublic, ...(company.logoDataUrl !== undefined ? { logoDataUrl: company.logoDataUrl } : {}) }) });
    const payload = await response.json();
    setPendingId(null);
    if (!response.ok) return setMessage(payload.error ?? "Company update failed.");
    setCompanies((items) => items.map((item) => item.id === company.id ? { ...item, ...payload.company, logoDataUrl: undefined } : item));
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

  async function updateLogo(company: Company, file: File | undefined) {
    if (!file) return;
    try {
      const logoDataUrl = await readLogoFile(file);
      setCompany(company.id, "logoDataUrl", logoDataUrl);
      setCompany(company.id, "logoMimeType", file.type);
      setMessage(`Logo ready for ${company.name}. Save the company row to apply it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The logo could not be loaded.");
    }
  }

  function clearLogo(company: Company) {
    setCompany(company.id, "logoDataUrl", null);
    setCompany(company.id, "logoMimeType", null);
    setMessage(`Logo removal ready for ${company.name}. Save the company row to apply it.`);
  }

  return <div className="admin-manager-grid">
    <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Plus size={18} /> New company</h2><p>Create an isolated knowledge workspace and its default role system.</p></div><form onSubmit={createCompany}><label>Company name<input name="name" required minLength={2} /></label><label>Workspace slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label><label>Portal logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return setNewCompanyLogo(null); void readLogoFile(file).then(setNewCompanyLogo).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "The logo could not be loaded.")); }} /><small>PNG, JPEG, or WebP · maximum 512 KB</small></label>{newCompanyLogo && <div className="company-create-logo-preview"><Image src={newCompanyLogo} alt="New company logo preview" width={56} height={56} unoptimized /><span>Logo preview</span></div>}<label className="admin-check"><input name="isPublic" type="checkbox" /> Allow explicitly public knowledge</label><button className="admin-primary-button" disabled={pendingId !== null}>Create company</button></form></section>
    <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>Company administration</h2><p>Manage workspace identity, portal branding, access state, and public exposure.</p></div><table className="admin-table"><thead><tr><th>Company & portal logo</th><th>Status</th><th>Data</th><th>Exposure</th><th>Actions</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><div className="company-logo-editor"><div className="company-logo-preview">{company.logoDataUrl ? <Image src={company.logoDataUrl} alt={`${company.name} logo preview`} width={40} height={40} unoptimized /> : company.logoMimeType ? <Image src={`/api/admin/companies/${company.id}`} alt={`${company.name} logo`} width={40} height={40} unoptimized /> : <Building2 size={20} aria-hidden="true" />}</div><div><label><span className="sr-only">Company name</span><input value={company.name} onChange={(event) => setCompany(company.id, "name", event.target.value)} /></label><label><span className="sr-only">Company slug</span><input value={company.slug} onChange={(event) => setCompany(company.id, "slug", event.target.value)} /></label><label className="company-logo-upload"><FileImage size={14} /> Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Upload logo for ${company.name}`} disabled={pendingId === company.id} onChange={(event) => void updateLogo(company, event.target.files?.[0])} /></label>{(company.logoMimeType || company.logoDataUrl) && <button type="button" className="company-logo-remove" disabled={pendingId === company.id} onClick={() => clearLogo(company)}>Remove logo</button>}</div></div></td><td><select aria-label={`Status for ${company.name}`} value={company.status} onChange={(event) => setCompany(company.id, "status", event.target.value as Company["status"])}><option>ACTIVE</option><option>SUSPENDED</option></select></td><td><strong><Building2 size={15} /> {company._count.memberships} members</strong><span>{company._count.sections} spaces · {company._count.articles} items</span></td><td><label className="admin-check"><input type="checkbox" checked={company.isPublic} onChange={(event) => setCompany(company.id, "isPublic", event.target.checked)} /> Public enabled</label></td><td><div className="admin-row-actions"><button type="button" disabled={pendingId === company.id} onClick={() => saveCompany(company)}><Save size={15} /> Save</button><button className="admin-danger-button" type="button" disabled={pendingId === company.id} onClick={() => deleteCompany(company)}><Trash2 size={15} /> Delete</button></div></td></tr>)}</tbody></table></section>
    {message && <p className="admin-manager-message" role="status">{message}</p>}
  </div>;
}
