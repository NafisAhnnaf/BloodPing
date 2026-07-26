CREATE OR REPLACE FUNCTION public.get_donor_matches(p_donor_id UUID)
RETURNS TABLE (
    match_id UUID,
    match_status public.donation_match_status,
    request_id UUID,
    hospital_name TEXT,
    hospital_address TEXT,
    required_by TIMESTAMPTZ,
    recipient_name TEXT,
    recipient_phone TEXT,
    applied_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dm.id AS match_id,
        dm.status AS match_status,
        dr.id AS request_id,
        dr.hospital_name,
        dr.hospital_address,
        dr.required_by,
        p.full_name AS recipient_name,
        p.phone AS recipient_phone,
        dm.applied_at,
        dm.accepted_at
    FROM public.donation_matches dm
    INNER JOIN public.donation_requests dr ON dm.request_id = dr.id
    INNER JOIN public.recipients r ON dr.recipient_id = r.id
    INNER JOIN public.profiles p ON r.user_id = p.id
    WHERE dm.donor_id = p_donor_id
    ORDER BY dm.applied_at DESC;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No matches found for donor %', p_donor_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_donor_matches failed due to an internal error: %', SQLERRM;
END;
$$;
