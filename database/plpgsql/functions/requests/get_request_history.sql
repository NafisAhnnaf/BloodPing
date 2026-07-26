CREATE OR REPLACE FUNCTION public.get_request_history(p_request_id UUID)
RETURNS TABLE (
    match_id UUID,
    donor_id UUID,
    donor_name TEXT,
    donor_blood_group public.blood_group,
    match_status public.donation_match_status,
    applied_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dm.id AS match_id,
        d.id AS donor_id,
        p.full_name AS donor_name,
        d.blood_group AS donor_blood_group,
        dm.status AS match_status,
        dm.applied_at,
        dm.accepted_at,
        dm.confirmed_at
    FROM public.donation_matches dm
    INNER JOIN public.donors d ON dm.donor_id = d.id
    INNER JOIN public.profiles p ON d.user_id = p.id
    WHERE dm.request_id = p_request_id
    ORDER BY dm.applied_at DESC;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No history found for request ID %', p_request_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_request_history failed due to an internal error: %', SQLERRM;
END;
$$;
