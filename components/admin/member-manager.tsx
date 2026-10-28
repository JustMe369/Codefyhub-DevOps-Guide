"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

type Role = { id: string; name: string; slug: string };
type Member = { id: string; status: "ACTIVE" | "SUSPENDED"; roleId: string; user: { id: string; name: string; email: string; emailVerified: boolean; createdAt: string | Date }; role: Role };

export function MemberManager({ initialMembers, roles, canManage }: { initialMembers: Member[]; roles: Role[]; canManage: boolean }) {
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState("");

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Member creation failed.");
    const refresh = await fetch("/api/admin/members");
    const refreshed = await refresh.json();
    setMembers(refreshed.members);
    form.reset();
    setMessage("Member account and workspace access created.");
  }

  async function updateMember(member: Member, roleId: string, status: "ACTIVE" | "SUSPENDED") {
    const response = await fetch(`/api/admin/members/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleId, status }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Member update failed.");
    const role = roles.find((item) => item.id === roleId)!;
    setMembers((items) => items.map((item) => item.id === member.id ? { ...item, roleId, role, status } : item));
    setMessage("Member access updated and active sessions revoked.");
  }

  return <div className="admin-manager-grid">
    {canManage && <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><UserPlus size={18} /> Add member</h2><p>Create a sign-in account and grant access to this company only.</p></div><form onSubmit={addMember}><label>Full name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Initial password<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label><label>Role<select name="roleId" required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><button className="admin-primary-button">Create member</button></form></section>}
    <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Account</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.user.name}</strong><span>{member.user.email}</span></td><td><select disabled={!canManage} value={member.roleId} onChange={(event) => updateMember(member, event.target.value, member.status)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td><select disabled={!canManage} value={member.status} onChange={(event) => updateMember(member, member.roleId, event.target.value as "ACTIVE" | "SUSPENDED")}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></td><td>{member.user.emailVerified ? "Verified" : "Password account"}</td></tr>)}</tbody></table>{members.length === 0 && <p className="admin-empty">No company members yet.</p>}</section>
    {message && <p className="admin-manager-message">{message}</p>}
  </div>;
}
