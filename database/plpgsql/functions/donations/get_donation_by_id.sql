CREATE OR REPLACE FUNCTION public.get_donation_by_id(p_donation_id UUID)
RETURNS TABLE (
    donation_id UUID,
    match_id UUID,
    donor_name TEXT,
    donor_blood_group public.blood_group,
    recipient_name TEXT,
    hospital_name TEXT,
    hospital_address TEXT,
    donated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dn.id AS donation_id,
        dn.match_id,
        dp.full_name AS donor_name,
        dn.blood_group AS donor_blood_group,
        rp.full_name AS recipient_name,
        dr.hospital_name,
        dr.hospital_address,
        dn.donated_at
    FROM public.donations dn
    INNER JOIN public.donors d ON dn.donor_id = d.id
    INNER JOIN public.profiles dp ON d.user_id = dp.id
    INNER JOIN public.recipients r ON dn.recipient_id = r.id
    INNER JOIN public.profiles rp ON r.user_id = rp.id
    INNER JOIN public.donation_requests dr ON dn.request_id = dr.id
    WHERE dn.id = p_donation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation % not found', p_donation_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_donation_by_id failed due to an internal error: %', SQLERRM;
END;
$$;
