CREATE OR REPLACE FUNCTION public.get_donor_donations(p_donor_id UUID)
RETURNS TABLE (
    donation_id UUID,
    recipient_name TEXT,
    hospital_name TEXT,
    donated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dn.id AS donation_id,
        rp.full_name AS recipient_name,
        dr.hospital_name,
        dn.donated_at
    FROM public.donations dn
    INNER JOIN public.recipients r ON dn.recipient_id = r.id
    INNER JOIN public.profiles rp ON r.user_id = rp.id
    INNER JOIN public.donation_requests dr ON dn.request_id = dr.id
    WHERE dn.donor_id = p_donor_id
    ORDER BY dn.donated_at DESC;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No completed donations found for donor %', p_donor_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_donor_donations failed due to an internal error: %', SQLERRM;
END;
$$;
