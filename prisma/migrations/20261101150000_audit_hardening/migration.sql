-- Shared fixed-window quota fallback when Redis is not configured.
CREATE TABLE "RateLimitBucket" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket" ("expiresAt");

-- Persist exactly the weighted document used by both public and portal search.
ALTER TABLE "Article" ADD COLUMN "searchDocument" tsvector NOT NULL DEFAULT ''::tsvector;
ALTER TABLE "GlossaryTerm" ADD COLUMN "searchDocument" tsvector GENERATED ALWAYS AS (
  to_tsvector('english', "term" || ' ' || "definition") || to_tsvector('simple', "term" || ' ' || "definition")
) STORED;

CREATE FUNCTION refresh_article_search_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchDocument" :=
    setweight(to_tsvector('english', NEW.title), 'A') || setweight(to_tsvector('simple', NEW.title), 'A') ||
    setweight(to_tsvector('english', NEW.description), 'B') || setweight(to_tsvector('simple', NEW.description), 'B') ||
    setweight(to_tsvector('english', NEW.body), 'C') || setweight(to_tsvector('simple', NEW.body), 'C') ||
    setweight(to_tsvector('simple', coalesce((SELECT string_agg(t.name, ' ' ORDER BY t.id) FROM "ArticleTag" at JOIN "Tag" t ON t.id = at."tagId" WHERE at."articleId" = NEW.id), '')), 'B');
  RETURN NEW;
END;
$$;
CREATE TRIGGER article_search_document BEFORE INSERT OR UPDATE OF title, description, body ON "Article"
  FOR EACH ROW EXECUTE FUNCTION refresh_article_search_document();

CREATE FUNCTION refresh_article_tag_search_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    UPDATE "Article" SET title = title WHERE id = OLD."articleId";
  END IF;
  IF TG_OP <> 'DELETE' THEN
    UPDATE "Article" SET title = title WHERE id = NEW."articleId";
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER article_tag_search_document AFTER INSERT OR UPDATE OR DELETE ON "ArticleTag"
  FOR EACH ROW EXECUTE FUNCTION refresh_article_tag_search_document();

CREATE FUNCTION refresh_tag_name_search_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Article" SET title = title WHERE id IN (SELECT "articleId" FROM "ArticleTag" WHERE "tagId" = NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER tag_name_search_document AFTER UPDATE OF name ON "Tag"
  FOR EACH ROW EXECUTE FUNCTION refresh_tag_name_search_document();
UPDATE "Article" SET title = title;
CREATE INDEX "Article_search_document_idx" ON "Article" USING GIN ("searchDocument");
CREATE INDEX "GlossaryTerm_search_document_idx" ON "GlossaryTerm" USING GIN ("searchDocument");
