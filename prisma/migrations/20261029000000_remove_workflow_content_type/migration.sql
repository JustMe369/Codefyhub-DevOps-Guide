-- WORKFLOW is retained for backwards compatibility with existing Article rows.
-- PostgreSQL does not support dropping an individual enum value. Removing it
-- from Prisma before migrating the data makes every query that returns a legacy
-- row fail with P2023, so the enum cleanup must happen in a later data migration.
SELECT 1;
