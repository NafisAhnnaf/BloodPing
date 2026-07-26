CREATE OR REPLACE FUNCTION public.donor_withdraws_match(
    p_match_id UUID,
    p_donor_id UUID
) RETURNS public.donation_matches AS $$
DECLARE
    v_withdrawn_match public.donation_matches;
BEGIN
    -- 1. Attempt the Update
    -- The WHERE clause ensures the donor owns this match and it hasn't already been completed/rejected
    UPDATE public.donation_matches
    SET 
        status = 'withdrawn',
        withdrawn_at = NOW()
    WHERE id = p_match_id
      AND donor_id = p_donor_id
      AND status IN ('pending', 'accepted')
    RETURNING * INTO v_withdrawn_match;

    -- 2. Validate Success
    IF v_withdrawn_match IS NULL THEN
        RAISE EXCEPTION 'Match not found, does not belong to you, or cannot be withdrawn at this stage.';
    END IF;

    RETURN v_withdrawn_match;
END;
$$ LANGUAGE plpgsql;
