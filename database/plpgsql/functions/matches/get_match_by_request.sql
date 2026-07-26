CREATE OR REPLACE FUNCTION public.get_match_by_request(p_request_id UUID)
RETURNS TABLE (
    match_id UUID,
    match_status public.donation_match_status,
    recipient_verification_note TEXT,
    donor_id UUID,
    donor_name TEXT,
    donor_phone TEXT,
    donor_blood_group public.blood_group,
    total_donations INTEGER,
    applied_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dm.id AS match_id,
        dm.status AS match_status,
        dm.recipient_verification_note,
        d.id AS donor_id,
        p.full_name AS donor_name,
        p.phone AS donor_phone,
        d.blood_group AS donor_blood_group,
        d.total_donations,
        dm.applied_at
    FROM public.donation_matches dm
    INNER JOIN public.donors d ON dm.donor_id = d.id
    INNER JOIN public.profiles p ON d.user_id = p.id
    WHERE dm.request_id = p_request_id
    ORDER BY dm.applied_at ASC;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No matches found for request %', p_request_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_match_by_request failed due to an internal error: %', SQLERRM;
END;
$$;
