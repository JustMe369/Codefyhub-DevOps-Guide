# Multi-tenant Knowledge Studio

## Security boundary

Every private record belongs to a `Company`. The active company is selected with an HTTP-only cookie, but the cookie is only a preference: the server verifies the signed-in user's active membership before creating an authorization context. Platform administrators may select any active company; company users may select only companies where they have an active membership.

Route handlers must call `requireAdminIdentity(headers, permission)` and include `identity.companyId` in every tenant-owned query. Client-side navigation and hidden buttons are usability controls, not authorization controls.

Public routes expose only records where all of the following are true:

- the company is active and allows public content;
- the section and article are published;
- the article visibility is `PUBLIC`.

Search, sitemap generation, glossary lookup, and AI retrieval apply the same boundary.

## Access model

Global Better Auth roles are reserved for the Codefyhub platform plane. Company access is represented by `Membership -> CompanyRole -> RolePermission`.

Protected company roles are provisioned with every new company:

- Company Owner
- Knowledge Admin
- Editor
- Reviewer
- Contributor
- Viewer

Custom roles may grant only permissions possessed by the actor. System roles cannot be edited or deleted. The last active company owner cannot be suspended or demoted. Membership and role changes revoke affected sessions.

## Operational workflow

1. Apply migrations with `npm run deploy:db`.
2. Create or repair the platform administrator with `npm run admin:bootstrap`.
3. Publish source-controlled Codefyhub content with `npm run deploy:content`.
4. Open `/admin/companies` to provision customer companies.
5. Switch to a company, then use `/admin/members`, `/admin/roles`, and `/admin/studio`.

The Studio clone action always creates an `INTERNAL`, unpublished draft with a new slug and immutable first revision.

## Next hardening stage

Before onboarding regulated or high-sensitivity customer data, add transaction-scoped PostgreSQL Row Level Security using a dedicated runtime database role. RLS must be introduced together with connection-safe tenant context; enabling policies without transaction-local context would break pooled Prisma requests. Application-level scoping and cross-tenant tests remain required after RLS is enabled.
