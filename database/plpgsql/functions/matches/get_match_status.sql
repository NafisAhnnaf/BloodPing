CREATE OR REPLACE FUNCTION public.get_match_status(p_match_id UUID)
RETURNS TABLE (
    match_status public.donation_match_status,
    recipient_verification_note TEXT,
    applied_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dm.status AS match_status,
        dm.recipient_verification_note,
        dm.applied_at,
        dm.accepted_at,
        dm.confirmed_at,
        dm.withdrawn_at
    FROM public.donation_matches dm
    WHERE dm.id = p_match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match with ID % not found', p_match_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_match_status failed due to an internal error: %', SQLERRM;
END;
$$;
