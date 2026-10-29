"use client";

import { useState } from "react";
import { Save, Trash2, UserPlus } from "lucide-react";

type Role = { id: string; name: string; slug: string };
type Member = { id: string; status: "ACTIVE" | "SUSPENDED"; roleId: string; user: { id: string; name: string; email: string; emailVerified: boolean; createdAt: string | Date }; role: Role };
type Invitation = { id: string; email: string; name: string; status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"; expiresAt: string | Date; createdAt: string | Date; role: Role };

export function MemberManager({ initialMembers, initialInvitations, roles, canManage, currentUserId }: { initialMembers: Member[]; initialInvitations: Invitation[]; roles: Role[]; canManage: boolean; currentUserId: string }) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [message, setMessage] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  function setMember(id: string, patch: Partial<Pick<Member, "roleId" | "status" | "role">>) {
    setMembers((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Invitation failed.");
    const refresh = await fetch("/api/admin/members");
    const refreshed = await refresh.json();
    setMembers(refreshed.members);
    setInvitations(refreshed.invitations ?? []);
    form.reset();
    setInviteUrl(payload.inviteUrl ?? "");
    setMessage(payload.existingAccount ? "Existing account granted workspace access." : "Invitation created. Share the secure link with the invited user.");
  }

  async function updateMember(member: Member, roleId: string, status: "ACTIVE" | "SUSPENDED") {
    setPendingId(member.id);
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
    const response = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Member removal failed.");
    setMembers((items) => items.filter((item) => item.id !== member.id));
    setMessage("Member access removed and active sessions revoked.");
  }

  async function revokeInvitation(invitation: Invitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    const response = await fetch(`/api/admin/invitations/${invitation.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Invitation revocation failed.");
    setInvitations((items) => items.filter((item) => item.id !== invitation.id));
    setMessage("Invitation revoked.");
  }

  return <div className="admin-manager-grid">
    {canManage && <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><UserPlus size={18} /> Invite member</h2><p>Create an expiring seven-day invitation. Administrators never choose or see the member password.</p></div><form onSubmit={addMember}><label>Full name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Role<select name="roleId" required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><button className="admin-primary-button">Create invitation</button></form>{inviteUrl && <div className="admin-invite-link"><label>Secure invitation link<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Copy link</button></div>}</section>}
    <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Account</th><th>Actions</th></tr></thead><tbody>{members.map((member) => { const isSelf = member.user.id === currentUserId; return <tr key={member.id}><td><strong>{member.user.name}</strong><span>{member.user.email}</span></td><td><select disabled={!canManage || pendingId === member.id} value={member.roleId} onChange={(event) => { const roleId = event.target.value; setMember(member.id, { roleId, role: roles.find((role) => role.id === roleId)! }); }}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td><select disabled={!canManage || pendingId === member.id} value={member.status} onChange={(event) => setMember(member.id, { status: event.target.value as "ACTIVE" | "SUSPENDED" })}><option value="ACTIVE">Active</option><option value="SUSPENDED" disabled={isSelf}>Suspended</option></select></td><td>{isSelf ? "Current account" : member.user.emailVerified ? "Verified" : "Password account"}</td><td>{canManage && <div className="admin-row-actions"><button type="button" disabled={pendingId === member.id} onClick={() => updateMember(member, member.roleId, member.status)}><Save size={15} /> Save</button>{!isSelf && <button className="admin-danger-button" type="button" disabled={pendingId === member.id} onClick={() => removeMember(member)}><Trash2 size={15} /> Remove</button>}</div>}</td></tr>; })}</tbody></table>{members.length === 0 && <p className="admin-empty">No company members yet.</p>}</section>
    {invitations.length > 0 && <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><h2>Pending invitations</h2><p>Invitations expire automatically after seven days.</p></div><table className="admin-table"><thead><tr><th>Invitee</th><th>Role</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.id}><td><strong>{invitation.name}</strong><span>{invitation.email}</span></td><td>{invitation.role.name}</td><td>{new Date(invitation.expiresAt).toLocaleDateString()}</td><td>{canManage && <button className="admin-danger-button" type="button" onClick={() => revokeInvitation(invitation)}><Trash2 size={15} /> Revoke</button>}</td></tr>)}</tbody></table></section>}
    {message && <p className="admin-manager-message">{message}</p>}
  </div>;
}
