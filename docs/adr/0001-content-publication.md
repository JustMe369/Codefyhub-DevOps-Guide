# ADR 0001: Transactional source-controlled content publication

## Status

Accepted.

## Context

The guide stores rendered editorial content in PostgreSQL while keeping the authoritative definitions in version control. Partial publication could expose articles without sources or leave mixed revisions.

## Decision

The seed command publishes sections, articles, revisions, sources, source relationships, and glossary entries in one database transaction. Existing verification dates are preserved unless a deliberate re-verification flag is supplied. Missing source-controlled records are archived rather than deleted, and source assignments are reconciled exactly.

## Consequences

Publication is atomic and recoverable through database transaction rollback. Large future corpora may require staged revisions and a final activation pointer instead of a single long transaction. Content changes still require database backup, migration review, and post-publication validation.
