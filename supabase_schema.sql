-- ==========================================================
-- VoiceMail Assist — Supabase Database Schema
-- ==========================================================
-- Run this SQL in the Supabase SQL Editor to set up the database.
-- Dashboard: https://supabase.com/dashboard/project/xgfoobfohniiaokgvdgm/sql/new
-- ==========================================================

-- ─── Emails Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  is_read boolean DEFAULT false,
  email_type text NOT NULL CHECK (email_type IN ('sent', 'received')),
  created_at timestamptz DEFAULT now()
);

-- Add a comment for documentation
COMMENT ON TABLE public.emails IS 'Stores sent and received emails for VoiceMail Assist users';

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Users can read their own emails
CREATE POLICY "Users can read own emails"
  ON public.emails
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own emails
CREATE POLICY "Users can insert own emails"
  ON public.emails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own emails
CREATE POLICY "Users can delete own emails"
  ON public.emails
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own emails (mark as read, etc.)
CREATE POLICY "Users can update own emails"
  ON public.emails
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Indexes for Performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_type ON public.emails(email_type);
