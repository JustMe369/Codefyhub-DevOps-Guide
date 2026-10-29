"use client";

import { useState } from "react";
import { Mail, Save, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Membership = { id: string; status: string; company: { id: string; name: string }; role: { name: string } };
type User = { id: string; name: string; email: string; emailVerified: boolean; role: string | null; banned: boolean | null; banReason: string | null; createdAt: string | Date; memberships: Membership[] };

export function UserManager({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savedEmails, setSavedEmails] = useState<Record<string, string>>(() => Object.fromEntries(initialUsers.map((user) => [user.id, user.email])));

  function setUser<K extends keyof User>(id: string, key: K, value: User[K]) {
    setUsers((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  async function saveUser(user: User) {
    setPendingId(user.id);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user.name, email: user.email, platformRole: user.role?.split(",").includes("admin") ? "admin" : "user", banned: Boolean(user.banned), banReason: user.banReason }) });
    const payload = await response.json() as { user?: User; error?: string; requiresSignIn?: boolean };
    setPendingId(null);
    if (!response.ok) return setMessage(payload.error ?? "User update failed.");
    setUsers((items) => items.map((item) => item.id === user.id ? { ...item, ...payload.user } : item));
    setSavedEmails((items) => ({ ...items, [user.id]: payload.user?.email ?? user.email }));
    if (payload.requiresSignIn) {
      await authClient.signOut();
      router.replace("/admin/sign-in?emailChanged=1");
      router.refresh();
      return;
    }
    setMessage("User identity and access were updated; active sessions were revoked.");
  }

  async function deleteUser(user: User) {
    const confirmation = window.prompt(`Permanently delete this account and all company memberships? Type ${user.email} to continue.`);
    if (confirmation?.toLowerCase() !== user.email.toLowerCase() || !window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    setPendingId(user.id);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmEmail: confirmation }) });
    const payload = await response.json();
    setPendingId(null);
    if (!response.ok) return setMessage(payload.error ?? "User deletion failed.");
    setUsers((items) => items.filter((item) => item.id !== user.id));
    setMessage("User account and all memberships were permanently deleted.");
  }

  return <section className="admin-panel admin-table-wrap"><div className="admin-panel-heading"><div><h2><UserCog size={18} /> Platform users</h2><p>Edit identity, administrator role, suspension, and company access. Company-specific roles remain managed from Members.</p></div><div className="admin-inline-note"><Mail size={16} /><span>To change your administrator email, edit it below and select <strong>Save & sign in again</strong>.</span></div></div><table className="admin-table"><thead><tr><th>Identity</th><th>Platform role</th><th>Companies</th><th>Access</th><th>Actions</th></tr></thead><tbody>{users.map((user) => { const isSelf = user.id === currentUserId; const emailChanged = savedEmails[user.id] !== user.email.trim().toLowerCase(); return <tr key={user.id}><td><label><span className="sr-only">Name</span><input value={user.name} onChange={(event) => setUser(user.id, "name", event.target.value)} /></label><label><span className="sr-only">Email</span><input type="email" value={user.email} onChange={(event) => setUser(user.id, "email", event.target.value)} /></label><span>{isSelf ? "Current administrator account" : user.emailVerified ? "Verified email" : "Password account"}</span></td><td><select aria-label={`Platform role for ${user.name}`} disabled={isSelf} value={user.role?.split(",").includes("admin") ? "admin" : "user"} onChange={(event) => setUser(user.id, "role", event.target.value)}><option value="user">User</option><option value="admin">Administrator</option></select></td><td>{user.memberships.map((membership) => <span key={membership.id}>{membership.company.name} · {membership.role.name} · {membership.status}</span>)}{user.memberships.length === 0 && <span>No company access</span>}</td><td><label className="admin-check"><input type="checkbox" disabled={isSelf} checked={Boolean(user.banned)} onChange={(event) => setUser(user.id, "banned", event.target.checked)} /> Suspended</label>{user.banned && <input aria-label={`Suspension reason for ${user.name}`} placeholder="Reason" value={user.banReason ?? ""} onChange={(event) => setUser(user.id, "banReason", event.target.value)} />}</td><td><div className="admin-row-actions"><button type="button" disabled={pendingId === user.id} onClick={() => saveUser(user)}><Save size={15} /> {isSelf && emailChanged ? "Save & sign in again" : "Save"}</button><button type="button" className="admin-danger-button" disabled={isSelf || pendingId === user.id} onClick={() => deleteUser(user)}><Trash2 size={15} /> Delete</button></div></td></tr>; })}</tbody></table>{message && <p className="admin-manager-message" role="status">{message}</p>}</section>;
}
