"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Link2, Save, Trash2, UserPlus, Users } from "lucide-react";
import { formatUtcDate } from "@/lib/date-format";

type Role = { id: string; name: string; slug: string };
type Member = { id: string; status: "ACTIVE" | "SUSPENDED"; roleId: string; user: { id: string; name: string; email: string; emailVerified: boolean; createdAt: string | Date }; role: Role };
type Invitation = { id: string; email: string; name: string; status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"; expiresAt: string | Date; createdAt: string | Date; role: Role };
type Company = { id: string; name: string; slug: string; status: "ACTIVE" | "SUSPENDED"; _count: { memberships: number } };

export function MemberManager({ initialMembers, initialInvitations, roles, canManage, currentUserId, activeCompanyId, activeCompanyName, companies }: { initialMembers: Member[]; initialInvitations: Invitation[]; roles: Role[]; canManage: boolean; currentUserId: string; activeCompanyId: string; activeCompanyName: string; companies: Company[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [message, setMessage] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  function setMember(id: string, patch: Partial<Pick<Member, "roleId" | "status" | "role">>) {
    setMembers((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function switchCompany(companyId: string) {
    if (companyId === activeCompanyId) return;
    setPendingId("COMPANY");
    setMessage("");
    try {
      const response = await fetch("/api/admin/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Could not change the company assignment scope.");
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setMessage("The company selection request could not reach the server.");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function refreshDirectory() {
    const response = await fetch("/api/admin/members");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not refresh company members.");
    setMembers(payload.items ?? []);
    setInvitations(payload.invitations ?? []);
  }

  async function submitAccess(action: "LINK" | "INVITE", event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPendingId(action);
    setMessage("");
    if (action === "LINK") setInviteUrl("");
    try {
      const data = { action, ...Object.fromEntries(new FormData(form)) };
      const response = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) return setMessage(payload.error ?? (action === "LINK" ? "Account linking failed." : "Invitation failed."));
      await refreshDirectory();
      form.reset();
      setInviteUrl(action === "INVITE" ? payload.inviteUrl ?? "" : "");
      setMessage(action === "LINK" ? "Existing platform account linked to this company." : "Invitation created. Share the secure link with the invited person.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The access request could not reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  async function updateMember(member: Member, roleId: string, status: "ACTIVE" | "SUSPENDED") {
    setPendingId(member.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleId, status }) });
      const payload = await response.json();
      if (!response.ok) return setMessage(payload.error ?? "Member update failed.");
      const role = roles.find((item) => item.id === roleId)!;
      setMember(member.id, { roleId, role, status });
      setMessage(member.user.id === currentUserId ? "Your company access was updated. Sign in again if your permissions changed." : "Member access updated and active sessions revoked.");
    } catch {
      setMessage("The member update could not reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Remove ${member.user.email} from this company? Their account in other companies will remain.`)) return;
    setPendingId(member.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) return setMessage(payload.error ?? "Member removal failed.");
      setMembers((items) => items.filter((item) => item.id !== member.id));
      setMessage("Member access removed and active sessions revoked.");
    } catch {
      setMessage("The member removal request could not reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  async function revokeInvitation(invitation: Invitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setPendingId(invitation.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/invitations/${invitation.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) return setMessage(payload.error ?? "Invitation revocation failed.");
      setInvitations((items) => items.filter((item) => item.id !== invitation.id));
      setMessage("Invitation revoked.");
    } catch {
      setMessage("The invitation revocation request could not reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  const activeCompany = companies.find((company) => company.id === activeCompanyId);

  return <div className="admin-manager-grid">
    {companies.length > 0 && <section className="admin-panel admin-member-company-scope">
      <div className="admin-company-scope-copy">
        <span className="admin-company-scope-icon"><Building2 size={20} /></span>
        <div><div className="eyebrow">Assignment target</div><h2>Company assignment scope</h2><p>Select the company whose members, invitations, and roles you want to manage.</p></div>
      </div>
      <label>
        <span>Company</span>
        <select defaultValue={activeCompanyId} disabled={pendingId !== null} onChange={(event) => void switchCompany(event.target.value)} aria-label="Company assignment scope">
          {companies.map((company) => <option key={company.id} value={company.id} disabled={company.status !== "ACTIVE"}>{company.name} — {company._count.memberships} {company._count.memberships === 1 ? "member" : "members"}{company.status !== "ACTIVE" ? " — suspended" : ""}</option>)}
        </select>
      </label>
      <div className="admin-company-scope-summary">
        <span><Users size={15} /> {activeCompany?._count.memberships ?? members.length} members</span>
        <span>{invitations.length} pending {invitations.length === 1 ? "invitation" : "invitations"}</span>
        <Link href="/admin/companies">Manage companies</Link>
      </div>
    </section>}
    {canManage && <div className="admin-member-onboarding">
      <section className="admin-panel admin-manager-form">
        <div className="admin-panel-heading"><h2><Link2 size={18} /> Link existing account</h2><p>Grant access to <strong>{activeCompanyName}</strong> for a user who already has a platform account.</p></div>
        <form onSubmit={(event) => void submitAccess("LINK", event)}>
          <label>Existing account email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Company role<select name="roleId" required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <button className="admin-primary-button" disabled={pendingId !== null || roles.length === 0}>{pendingId === "LINK" ? "Linking…" : "Link user to company"}</button>
        </form>
      </section>
      <section className="admin-panel admin-manager-form">
        <div className="admin-panel-heading"><h2><UserPlus size={18} /> Invite new person</h2><p>Create a single-use, seven-day invitation to <strong>{activeCompanyName}</strong> for someone without an account.</p></div>
        <form onSubmit={(event) => void submitAccess("INVITE", event)}>
          <label>Full name<input name="name" autoComplete="name" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Company role<select name="roleId" required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <button className="admin-primary-button" disabled={pendingId !== null || roles.length === 0}>{pendingId === "INVITE" ? "Creating…" : "Create invitation"}</button>
        </form>
        {inviteUrl && <div className="admin-invite-link"><label>Secure invitation link<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)}>Copy link</button></div>}
      </section>
    </div>}

    <div className={`admin-member-directory${canManage ? "" : " full"}`}>
      <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>{activeCompanyName} members</h2><p>Role and status changes revoke active sessions immediately.</p></div><table className="admin-table"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Account</th><th>Actions</th></tr></thead><tbody>{members.map((member) => { const isSelf = member.user.id === currentUserId; return <tr key={member.id}><td><strong>{member.user.name}</strong><span>{member.user.email}</span></td><td><select aria-label={`Role for ${member.user.email}`} disabled={!canManage || pendingId === member.id} value={member.roleId} onChange={(event) => { const roleId = event.target.value; setMember(member.id, { roleId, role: roles.find((role) => role.id === roleId)! }); }}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td><select aria-label={`Status for ${member.user.email}`} disabled={!canManage || pendingId === member.id} value={member.status} onChange={(event) => setMember(member.id, { status: event.target.value as "ACTIVE" | "SUSPENDED" })}><option value="ACTIVE">Active</option><option value="SUSPENDED" disabled={isSelf}>Suspended</option></select></td><td>{isSelf ? "Current account" : member.user.emailVerified ? "Verified" : "Password account"}</td><td>{canManage && <div className="admin-row-actions"><button type="button" disabled={pendingId === member.id} onClick={() => void updateMember(member, member.roleId, member.status)}><Save size={15} /> Save</button>{!isSelf && <button className="admin-danger-button" type="button" disabled={pendingId === member.id} onClick={() => void removeMember(member)}><Trash2 size={15} /> Remove</button>}</div>}</td></tr>; })}</tbody></table>{members.length === 0 && <p className="admin-empty">No members are linked to {activeCompanyName} yet.</p>}</section>
      {invitations.length > 0 && <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>Pending invitations</h2><p>Invitations expire automatically after seven days.</p></div><table className="admin-table"><thead><tr><th>Invitee</th><th>Role</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.id}><td><strong>{invitation.name}</strong><span>{invitation.email}</span></td><td>{invitation.role.name}</td><td>{formatUtcDate(invitation.expiresAt)}</td><td>{canManage && <button className="admin-danger-button" type="button" disabled={pendingId === invitation.id} onClick={() => void revokeInvitation(invitation)}><Trash2 size={15} /> {pendingId === invitation.id ? "Revoking…" : "Revoke"}</button>}</td></tr>)}</tbody></table></section>}
    </div>
    {message && <p className="admin-manager-message" role="status" aria-live="polite">{message}</p>}
  </div>;
}
