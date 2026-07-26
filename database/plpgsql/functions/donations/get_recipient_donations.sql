CREATE OR REPLACE FUNCTION public.get_recipient_donations(p_recipient_id UUID)
RETURNS TABLE (
    donation_id UUID,
    donor_name TEXT,
    donor_blood_group public.blood_group,
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
        dp.full_name AS donor_name,
        dn.blood_group AS donor_blood_group,
        dr.hospital_name,
        dn.donated_at
    FROM public.donations dn
    INNER JOIN public.donors d ON dn.donor_id = d.id
    INNER JOIN public.profiles dp ON d.user_id = dp.id
    INNER JOIN public.donation_requests dr ON dn.request_id = dr.id
    WHERE dn.recipient_id = p_recipient_id
    ORDER BY dn.donated_at DESC;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No completed donations found for recipient %', p_recipient_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_recipient_donations failed due to an internal error: %', SQLERRM;
END;
$$;
