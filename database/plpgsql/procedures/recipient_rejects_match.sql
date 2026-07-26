CREATE OR REPLACE FUNCTION public.recipient_rejects_match(
    p_match_id UUID,
    p_recipient_id UUID,
    p_rejection_note TEXT DEFAULT NULL
) RETURNS public.donation_matches AS $$
DECLARE
    v_updated_match public.donation_matches;
BEGIN
    -- 1. Attempt the Update
    -- We use a FROM clause to join with donation_requests to securely verify 
    -- that the recipient executing this actually owns the parent request.
    UPDATE public.donation_matches m
    SET 
        status = 'rejected',
        recipient_verification_note = COALESCE(p_rejection_note, m.recipient_verification_note)
    FROM public.donation_requests r
    WHERE m.id = p_match_id
      AND m.request_id = r.id
      AND r.recipient_id = p_recipient_id
      AND m.status IN ('pending', 'accepted') -- Can only reject if not already confirmed/withdrawn
    RETURNING m.* INTO v_updated_match;

    -- 2. Validate Success
    IF v_updated_match IS NULL THEN
        RAISE EXCEPTION 'Match not found, you do not own the parent request, or the match cannot be rejected in its current state.';
    END IF;

    RETURN v_updated_match;
END;
$$ LANGUAGE plpgsql;
