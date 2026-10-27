-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to Article for vector search
ALTER TABLE "Article" ADD COLUMN "embedding" vector(384);

-- Create index for cosine similarity search
CREATE INDEX "Article_embedding_idx" ON "Article" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
