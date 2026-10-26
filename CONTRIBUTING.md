# Contributing

Contributions must preserve the guide's safety, evidence, and recovery standards.

## Content requirements

Every technical article must identify its audience, prerequisites, supported versions, security implications, implementation procedure, validation evidence, failure modes, rollback or recovery procedure, and authoritative sources. Advanced articles must also contain a practical exercise or decision record.

Do not present destructive commands without a warning, target-verification step, recovery path, and expected outcome. Never use real credentials, production identifiers, or private URLs in examples.

## Workflow

1. Create a focused change and update its explicit source assignment.
2. Verify technical claims against current first-party documentation.
3. Set `CONTENT_REVERIFY=true` only after a deliberate review of existing material.
4. Run `npm run deploy:content` twice and confirm the second run creates no revision or timestamp changes.
5. Run `npm run content:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
6. Explain user impact, validation evidence, compatibility, and rollback in the pull request.

Editorial approval and code approval are separate responsibilities. A technically valid implementation must not self-certify its own factual review.
