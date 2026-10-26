<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repo conventions (human-maintained — keep this block)

**What this repo is:** the Codefyhub DevOps Guide — a Next.js + TypeScript + Tailwind + Prisma/Postgres documentation site, deployed on Vercel as project `codefyhub-dev-ops-guide`.

**Commands that are safe to run:**

```bash
npm run typecheck   # gate 1
npm run lint        # gate 2
npm test            # vitest, lib/
npm run dev         # local dev server
```

**Build:** `npm run build` generates Prisma Client and runs the Next.js production build without mutating the database. Apply migrations with `npm run deploy:db` and publish source-controlled content with `npm run deploy:content`.

**Deploy:** `vercel deploy --prod` from this directory, or push to `main` (repo is connected to Vercel). Never deploy production without typecheck + lint passing. Link with `vercel link --yes --project codefyhub-dev-ops-guide` — plain `vercel link` fails because the folder name `DevOps-doc` is not a valid project name.

**Content:** source pages live in the agent profile's `site_content/` corpus. Match existing page structure and Tailwind tokens (`bg-background`, `text-primary`, `border-primary`) when adding pages.

**Do not:** force-push, rewrite history, delete content files silently, commit `.env*` or `.vercel/`.
