# Content authoring

New and substantially revised guides use one Markdown body per guide plus a validated category manifest. The Storage & RAID files in `site_content/storage-raid/` are the reference implementation while legacy seed content is migrated incrementally.

## Content types

- `CONCEPT`: mechanisms, terminology, architecture, and tradeoffs.
- `HOW_TO`: one bounded operational objective.
- `RUNBOOK`: diagnosis and recovery for an operational condition.
- `REFERENCE`: precise commands, parameters, or compatibility information.
- `CONFIGURATION_RECIPE`: a reusable artifact with deployment and rollback guidance.
- `LEARNING_PATH`: ordered prerequisites, exercises, and completion evidence.

## Validation status

- `DRAFT`: review and execution evidence are incomplete.
- `SOURCE_REVIEWED`: consequential claims were checked against first-party sources; commands were not executed for publication.
- `LAB_TESTED`: source review plus a recorded date and environment for actual execution.

Never infer `LAB_TESTED` from publication, build success, syntax validation, or a reviewer name.

## Authoring flow

1. Add or update a Markdown body and its manifest entry.
2. Use stable `section/slug` keys for prerequisites and related guides.
3. Assign first-party source titles that exist in the publisher source catalog.
4. Put complete reusable files in `public/configurations/` and link them from the guide.
5. Run the source validator before publishing.
6. Apply migrations and publish content explicitly; builds do not change the database.
7. Run database-backed content, link, and search checks after publication.

```powershell
npm run content:source
npm run db:generate
npm run deploy:db
npm run deploy:content
npm run content:check
npm run content:internal-links
npm run search:check
npm run secrets:check
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Operational content requirements

How-to guides identify objective, scenario, applicability, variables, prerequisites, architecture, exact procedure, security boundaries, expected evidence, troubleshooting, and rollback or recovery.

Runbooks begin with symptoms and read-only evidence. They separate plausible causes with diagnostic commands, define stop conditions, state-changing steps, verification, and recovery or escalation.

Copyable blocks must omit shell prompts and line numbers. Use placeholders such as `<array>` and explain them before use. Never include real credentials, production addresses, or customer identifiers.
