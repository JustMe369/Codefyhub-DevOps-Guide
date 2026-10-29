#!/usr/bin/env bash
set -euo pipefail

# Production code must never be released ahead of its additive schema changes.
# Preview builds migrate only when explicitly configured with an isolated DB.
if [[ "${VERCEL_ENV:-}" == "production" || "${APPLY_DATABASE_MIGRATIONS:-}" == "1" ]]; then
  npm run deploy:db
fi

npm run build

if [[ "${PUBLISH_SOURCE_CONTENT:-}" == "1" ]]; then
  npm run deploy:content
fi

if [[ "${PUBLISH_REMOTE_WORKFLOW:-}" == "1" ]]; then
  npm run deploy:remote-workflow
fi

if [[ "${VERIFY_CONTROL_PLANE:-}" == "1" ]]; then
  npm run admin:check
fi
