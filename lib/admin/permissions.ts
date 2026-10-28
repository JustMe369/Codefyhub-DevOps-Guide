export const permissionCatalog = [
  { key: "company.manage", group: "Company", description: "Manage company settings" },
  { key: "members.view", group: "Members", description: "View company members" },
  { key: "members.manage", group: "Members", description: "Create, update, and suspend members" },
  { key: "roles.view", group: "Roles", description: "View company roles" },
  { key: "roles.manage", group: "Roles", description: "Create and update custom roles" },
  { key: "content.view", group: "Knowledge", description: "View company knowledge" },
  { key: "content.create", group: "Knowledge", description: "Create knowledge drafts" },
  { key: "content.edit", group: "Knowledge", description: "Edit knowledge drafts" },
  { key: "content.review", group: "Knowledge", description: "Review knowledge changes" },
  { key: "content.publish", group: "Knowledge", description: "Publish knowledge changes" },
  { key: "structure.manage", group: "Knowledge", description: "Manage spaces, sections, and tags" },
  { key: "sources.manage", group: "Knowledge", description: "Manage evidence sources" },
  { key: "audit.view", group: "Governance", description: "View the company audit trail" },
  { key: "ai.use", group: "AI", description: "Use the company AI assistant" },
  { key: "ai.manage", group: "AI", description: "Manage AI settings and analytics" },
] as const;

export type PermissionKey = (typeof permissionCatalog)[number]["key"];
export const permissionKeys = permissionCatalog.map(({ key }) => key) as PermissionKey[];

export const systemRoleTemplates: Array<{
  name: string;
  slug: string;
  description: string;
  permissions: PermissionKey[];
}> = [
  { name: "Company Owner", slug: "company-owner", description: "Full company control and ownership protection.", permissions: permissionKeys },
  { name: "Knowledge Admin", slug: "knowledge-admin", description: "Manage members, structure, knowledge, and publishing.", permissions: permissionKeys.filter((key) => key !== "company.manage") },
  { name: "Editor", slug: "editor", description: "Create and edit company knowledge.", permissions: ["content.view", "content.create", "content.edit", "sources.manage"] },
  { name: "Reviewer", slug: "reviewer", description: "Review and publish approved knowledge.", permissions: ["content.view", "content.review", "content.publish"] },
  { name: "Contributor", slug: "contributor", description: "Create and edit assigned drafts.", permissions: ["content.view", "content.create", "content.edit"] },
  { name: "Viewer", slug: "viewer", description: "Read published company knowledge.", permissions: ["content.view", "ai.use"] },
];
