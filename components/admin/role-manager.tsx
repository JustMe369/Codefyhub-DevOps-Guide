"use client";

import { useState } from "react";
import { Save, ShieldPlus, Trash2 } from "lucide-react";

type Permission = { key: string; group: string; description: string };
type Role = { id: string; name: string; slug: string; description: string; isSystem: boolean; permissions: Array<{ permissionId: string; permission: Permission }>; _count: { memberships: number } };

export function RoleManager({ initialRoles, permissions, canManage, isPlatformAdmin }: { initialRoles: Role[]; permissions: readonly Permission[]; canManage: boolean; isPlatformAdmin: boolean }) {
  const [roles, setRoles] = useState(initialRoles);
  const [message, setMessage] = useState("");

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), slug: data.get("slug"), description: data.get("description"), permissions: data.getAll("permissions") }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Role creation failed.");
    const refresh = await fetch("/api/admin/roles");
    const refreshed = await refresh.json();
    setRoles(refreshed.roles);
    form.reset();
    setMessage("Custom role created.");
  }

  function updateRole(id: string, patch: Partial<Role>) {
    setRoles((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function togglePermission(role: Role, permissionId: string) {
    const hasPermission = role.permissions.some((item) => item.permissionId === permissionId);
    const next = hasPermission ? role.permissions.filter((item) => item.permissionId !== permissionId) : [...role.permissions, { permissionId, permission: permissions.find((item) => item.key === permissionId)! }];
    updateRole(role.id, { permissions: next });
  }

  async function saveRole(role: Role) {
    const response = await fetch(`/api/admin/roles/${role.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: role.name, description: role.description, permissions: role.permissions.map((item) => item.permissionId) }) });
    const payload = await response.json();
    setMessage(response.ok ? "Role and permissions updated; affected sessions were revoked." : payload.error ?? "Role update failed.");
  }

  async function deleteRole(role: Role) {
    if (!window.confirm(`Delete role ${role.name}?`)) return;
    const response = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Role deletion failed.");
    setRoles((items) => items.filter((item) => item.id !== role.id));
    setMessage("Custom role deleted.");
  }

  return <div className="admin-role-layout">
    {canManage && <section className="admin-panel admin-manager-form"><div className="admin-panel-heading"><h2><ShieldPlus size={18} /> Custom role</h2><p>Combine only the capabilities this job needs.</p></div><form onSubmit={createRole}><label>Role name<input name="name" required /></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label><label>Description<textarea name="description" minLength={5} required /></label><fieldset className="admin-permission-grid"><legend>Permissions</legend>{permissions.map((permission) => <label key={permission.key}><input type="checkbox" name="permissions" value={permission.key} /> <span><strong>{permission.key}</strong><small>{permission.description}</small></span></label>)}</fieldset><button className="admin-primary-button">Create role</button>{message && <p className="admin-success">{message}</p>}</form></section>}
    <section className="admin-role-cards">{roles.map((role) => { const editable = canManage && (!role.isSystem || isPlatformAdmin); return <article className="admin-panel" key={role.id}><div><span className="eyebrow">{role.isSystem ? "Protected system role" : "Custom role"}</span>{editable ? <><label>Role name<input value={role.name} onChange={(event) => updateRole(role.id, { name: event.target.value })} /></label><label>Description<textarea value={role.description} onChange={(event) => updateRole(role.id, { description: event.target.value })} /></label></> : <><h2>{role.name}</h2><p>{role.description}</p></>}</div><div className="admin-role-meta"><span>{role._count.memberships} members</span><span>{role.permissions.length} permissions</span></div>{editable ? <fieldset className="admin-permission-grid"><legend>Permissions</legend>{permissions.map((permission) => <label key={permission.key}><input type="checkbox" checked={role.permissions.some((item) => item.permissionId === permission.key)} onChange={() => togglePermission(role, permission.key)} /> <span><strong>{permission.key}</strong><small>{permission.description}</small></span></label>)}</fieldset> : <div className="admin-permission-pills">{role.permissions.map(({ permissionId }) => <span key={permissionId}>{permissionId}</span>)}</div>}{editable && <div className="admin-row-actions"><button type="button" onClick={() => saveRole(role)}><Save size={15} /> Save role</button>{!role.isSystem && <button className="admin-danger-button" type="button" onClick={() => deleteRole(role)}><Trash2 size={15} /> Delete</button>}</div>}</article>; })}</section>
    {message && <p className="admin-manager-message" role="status">{message}</p>}
  </div>;
}
