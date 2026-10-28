"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";

type Company = { id: string; name: string; slug: string; status: string; isPublic: boolean; _count: { memberships: number; articles: number; sections: number } };

export function CompanyManager({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [message, setMessage] = useState("");

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), slug: data.get("slug"), isPublic: data.get("isPublic") === "on" }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Company creation failed.");
    setCompanies((items) => [...items, { ...payload.company, _count: { memberships: 0, articles: 0, sections: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
    form.reset();
    setMessage("Company workspace created with protected system roles.");
  }

  return <div className="admin-manager-grid">
    <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><Plus size={18} /> New company</h2><p>Create an isolated knowledge workspace and its default role system.</p></div><form onSubmit={createCompany}><label>Company name<input name="name" required minLength={2} /></label><label>Workspace slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label><label className="admin-check"><input name="isPublic" type="checkbox" /> Allow explicitly public knowledge</label><button className="admin-primary-button">Create company</button>{message && <p className={message.includes("failed") ? "admin-error" : "admin-success"}>{message}</p>}</form></section>
    <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Company</th><th>Status</th><th>Members</th><th>Knowledge</th><th>Exposure</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><strong><Building2 size={15} /> {company.name}</strong><span>{company.slug}</span></td><td><span className={`admin-status ${company.status.toLowerCase()}`}>{company.status}</span></td><td>{company._count.memberships}</td><td>{company._count.sections} spaces · {company._count.articles} items</td><td>{company.isPublic ? "Public enabled" : "Private only"}</td></tr>)}</tbody></table></section>
  </div>;
}
