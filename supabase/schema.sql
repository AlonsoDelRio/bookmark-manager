-- ============================================================
-- Bookmark Manager — Supabase Schema + RLS
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table: bookmarks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    title       TEXT NOT NULL,
    favicon_url TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
-- User's bookmarks ordered by creation (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created
    ON public.bookmarks (user_id, created_at DESC);

-- Full-text search on title + url (combined tsvector)
CREATE INDEX IF NOT EXISTS idx_bookmarks_fts
    ON public.bookmarks
    USING GIN (to_tsvector('english', title || ' ' || url));

-- GIN index for fast tag array containment queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags
    ON public.bookmarks USING GIN (tags);

-- Filter by read status
CREATE INDEX IF NOT EXISTS idx_bookmarks_is_read
    ON public.bookmarks (user_id, is_read);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookmarks_updated_at ON public.bookmarks;
CREATE TRIGGER trg_bookmarks_updated_at
    BEFORE UPDATE ON public.bookmarks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
-- RLS enforces data isolation at the database level.
-- Even if application-level auth is bypassed, users cannot
-- read or modify other users' bookmarks.

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own rows
CREATE POLICY "bookmarks_select_own"
    ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: users can only insert rows where user_id = their own UID
CREATE POLICY "bookmarks_insert_own"
    ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update their own rows
CREATE POLICY "bookmarks_update_own"
    ON public.bookmarks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
CREATE POLICY "bookmarks_delete_own"
    ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- ── Grant public access (Supabase anon/authenticated roles) ──
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.bookmarks TO authenticated;

-- ============================================================
-- Verification: run these to confirm RLS is active
-- ============================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bookmarks';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookmarks';
