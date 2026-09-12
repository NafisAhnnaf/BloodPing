-- =============================================================================
-- Migration: 004_role_management_and_revocation.sql
-- Description: Add is_active flag to donors, update get_user_role, and support role revocation
-- Platform: PostgreSQL / Supabase
-- =============================================================================

-- 1. Add is_active column to public.donors table
ALTER TABLE public.donors
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_donors_is_active ON public.donors(is_active);

-- 2. Update get_user_role function to check is_active
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_donor BOOLEAN;
    v_is_recipient BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.donors WHERE user_id = p_user_id AND is_active IS TRUE) INTO v_is_donor;
    SELECT EXISTS(SELECT 1 FROM public.recipients WHERE user_id = p_user_id AND is_active IS TRUE) INTO v_is_recipient;
    SELECT EXISTS(SELECT 1 FROM public.admins WHERE user_id = p_user_id) INTO v_is_admin;

    IF v_is_admin THEN
        RETURN 'admin';
    ELSIF v_is_donor AND v_is_recipient THEN
        RETURN 'both';
    ELSIF v_is_donor THEN
        RETURN 'donor';
    ELSIF v_is_recipient THEN
        RETURN 'recipient';
    ELSE
        RETURN NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error occurred while getting user role: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Determines if a user acts as a donor, recipient, both, or neither based on active records in respective tables.';
