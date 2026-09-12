-- =============================================================================
-- Migration: Add Points System (donors table & points_history table)
-- Platform: PostgreSQL / Supabase
-- =============================================================================

-- 1. Add total_points column to donors table
ALTER TABLE public.donors 
ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0);

-- 2. Create points_history table
CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.donation_matches(id) ON DELETE SET NULL,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN (
        'DONATION_COMPLETED', 
        'CANCELLATION_PENALTY', 
        'NO_SHOW_PENALTY', 
        'STREAK_BONUS', 
        'MILESTONE_BONUS', 
        'FIRST_DONATION_BONUS'
    )),
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_points_history_donor ON public.points_history(donor_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created ON public.points_history(created_at DESC);
