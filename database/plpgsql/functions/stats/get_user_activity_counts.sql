-- =============================================================================
-- PL/pgSQL Function: get_user_activity_counts.sql
-- Description: Retrieves total donations made as a donor and total donation
--              requests created as a recipient for a given user ID.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_activity_counts(p_user_id UUID)
RETURNS TABLE (
    total_donations INTEGER,
    total_requests INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_donations INTEGER := 0;
    v_requests INTEGER := 0;
BEGIN
    -- 1. Calculate total donations as donor
    SELECT GREATEST(
        COALESCE(d.total_donations, 0),
        COALESCE((SELECT COUNT(*)::INTEGER FROM public.donations dn WHERE dn.donor_id = d.id), 0)
    )
    INTO v_donations
    FROM public.donors d
    WHERE d.user_id = p_user_id;

    IF v_donations IS NULL THEN
        v_donations := 0;
    END IF;

    -- 2. Calculate total requests as recipient
    SELECT COUNT(*)::INTEGER
    INTO v_requests
    FROM public.donation_requests dr
    INNER JOIN public.recipients r ON dr.recipient_id = r.id
    WHERE r.user_id = p_user_id;

    IF v_requests IS NULL THEN
        v_requests := 0;
    END IF;

    RETURN QUERY SELECT v_donations, v_requests;
END;
$$;

COMMENT ON FUNCTION public.get_user_activity_counts(UUID) IS 'Returns the total completed donations (as donor) and total blood requests (as recipient) for a user.';
