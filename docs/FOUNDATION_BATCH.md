# Foundation and Storage & RAID batch — 2026-10-27

## Delivered

The existing Next.js, TypeScript, Tailwind, Prisma and PostgreSQL stack is retained. Public guide URLs are preserved. Markdown plus a validated manifest in `site_content/` is the new authoring source; the publisher imports it into the existing database. Legacy seed content remains available for incremental migration.

The Storage & RAID landing page groups learning, procedures and incident response. `/guides/storage-raid/mdadm-zfs` is substantially revised, `/guides/storage-raid/degraded-mdadm-recovery` is new, and `/configurations/mdadm-monitoring` provides a reusable download with installation, verification and rollback instructions. Both operational articles are source-reviewed, not lab-tested.

Homepage task entry points and recent content use real published metadata. Article metadata exposes applicability, prerequisites, review status, related guides and source links. Search uses the existing PostgreSQL service, with weighted title/body/tag matching, snippets, filters and a debounced Ctrl/Cmd+K header experience. It fetches results on demand rather than shipping article bodies to the browser.

Builds generate Prisma Client and compile the application without migrating or publishing content. Deployment performs migrations and content publication explicitly after verification. Duplicate CI/deploy workflows were consolidated into `.github/workflows/quality.yml`.

## Changed areas

- `app/page.tsx`, `app/globals.css`, category/article routes, search page, sitemap, new API search and configuration routes.
- `components/site-header.tsx`, `components/code-block.tsx`, `components/markdown-article.tsx`, new `components/docs/content-metadata.tsx`.
- `lib/search.ts`, `lib/content/source-content.ts`, Prisma schema, migration and publisher.
- `site_content/storage-raid/manifest.json`, two Markdown articles, `public/configurations/mdadm-monitoring.conf`.
- Content/source/internal-link/search/secret validators, browser tests, package scripts, local database startup quoting and CI workflow.
- README, CONTRIBUTING, `.env.example` and `docs/CONTENT_AUTHORING.md`.

Existing concurrent OpenRouter changes in the chat route and README were preserved. Two unused bindings in the chat component were removed to clear lint warnings.

## Executed verification

Environment: Windows, local PostgreSQL 18, Node.js runtime from the installed workspace, production Next.js build, Playwright Chromium/Firefox/WebKit/Pixel 7 projects. No infrastructure storage commands were executed.

- Local migration and repeated content publication succeeded: 12 categories, 62 articles, 31 reference sources.
- Production build, TypeScript and ESLint passed.
- Vitest: 7 tests passed.
- Source metadata: 2 articles passed; published content: 62 articles, zero warnings.
- Internal links and relationships passed for 62 articles.
- Search evaluation: exact command, error fragment, product, scenario and empty-result queries passed.
- Secret scan passed; dependency audit reported zero known vulnerabilities.
- Production browser matrix: 19 passed, 4 intentionally skipped, 1 Firefox test passed on retry after a timeout. A focused Firefox rerun with retries disabled passed (21.3 seconds). The skips avoid repeating browser-independent HTTP/axe work. All sitemap URLs were exercised by the route test. The cold-navigation timing remains a follow-up item.
- Core-page axe checks found no serious or critical violations in the tested ruleset. This is not a complete accessibility certification.
- Desktop 1440px and mobile 390px checks found no page-level overflow on representative homepage, category, search, article and configuration pages. Light-theme homepage was visually reviewed after the final styling change.
- Reference links: 29/31 returned successfully; Sigstore and Let's Encrypt had fetch failures, also present at baseline. These need another network or manual check.
- `git diff --check` passed.

Earlier development browser runs failed from search hydration/cold-navigation timing. Header search now waits for client initialization and reads the submitted query from the form. The production matrix above is the final full-suite evidence. No numeric performance score or improvement claim is made.

## Deployment and rollback

No production deployment was performed. Configure GitHub production-environment protection and secrets `DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. The production database must be backed up before migration/content publication. `NEXT_PUBLIC_REPOSITORY_URL` enables source links; the existing chat feature still uses its separately configured provider key.

CI runs checks against a disposable PostgreSQL service, builds the app, then runs browser tests against `next start`. After production approval, the deploy job generates the client, applies migrations, publishes content, pulls Vercel configuration, builds and deploys a prebuilt artifact. Confirm the Vercel project's automatic Git deployments do not bypass this gate; select one production deployment owner.

For rollback, promote the prior known-good Vercel deployment and verify health, search and a representative article. The schema migration is additive, so retain the new columns while running the previous app. Content publication changes the database separately: restore an isolated copy from backup and selectively restore affected article records if content rollback is needed. Do not automatically reverse migrations or restore a whole production database over newer edits.

Tracked `.vercel-env-preview.txt` and `.vercel-env-prod.txt` were removed from the working tree because they contained token-shaped values. They remain recoverable in Git history. Revoke/rotate exposed credentials through the owning service; removing files does not revoke tokens. No history was rewritten.

## Remaining work

- Review and migrate the other 60 articles; their default draft classification is not evidence of technical validation.
- Run an isolated Linux storage lab before marking either operational guide lab-tested. The configuration artifact has not been checked with native mdadm on Windows.
- Search is English, lexical and PostgreSQL-backed: no typo tolerance, semantic retrieval or offline mode. Punctuation and shell flags are tokenized; results are capped at 30. Larger corpora need a measured query plan and maintained index strategy.
- Extend accessibility coverage to all new pages, test tablet layouts explicitly, and collect reproducible performance measurements before setting targets.
- Stabilize the Firefox cold-navigation timeout and check the two unreachable external sources.
- Expand Linux/systemd next, then networking/OpenWrt, using reviewed content batches and the same gates.

See `CONTENT_AUTHORING.md` for authoring, validation-status definitions and publishing commands. Local development remains `npm run dev`; production compilation is `npm run build`, followed by `npm start` against a migrated, published database.
