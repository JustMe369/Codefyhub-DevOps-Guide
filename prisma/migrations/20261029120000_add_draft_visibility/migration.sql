-- Add DRAFT visibility so unpublished knowledge can stay hidden from readers.
ALTER TYPE "ContentVisibility" ADD VALUE IF NOT EXISTS 'DRAFT';
