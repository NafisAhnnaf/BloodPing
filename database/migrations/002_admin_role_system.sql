-- =============================================================================
-- Migration: 002_admin_role_system.sql
-- Description: Add ban tracking to profiles and create notifications table
-- Platform: PostgreSQL / Supabase
-- =============================================================================

-- 1. Add ban tracking columns to public.profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.profiles(id);

-- Index for fast lookup of banned status
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- 2. Create public.notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'system' CHECK (type IN (
                    'application_approved',
                    'application_rejected',
                    'account_banned',
                    'system'
                )),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching user notifications by read status
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
