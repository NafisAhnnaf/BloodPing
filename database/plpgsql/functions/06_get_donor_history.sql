CREATE OR REPLACE FUNCTION public.get_donor_history(p_donor_id UUID)
RETURNS TABLE (
    donation_date TIMESTAMPTZ,
    blood_group public.blood_group,
    hospital_name TEXT,
    status public.donation_match_status
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.donors WHERE id = p_donor_id) THEN
        RAISE EXCEPTION 'Donor with ID % not found', p_donor_id;
    END IF;

    RETURN QUERY
    SELECT 
        dm.applied_at AS donation_date,
        req.blood_group,
        req.hospital_name,
        dm.status
    FROM public.donation_matches dm
    JOIN public.donation_requests req ON dm.request_id = req.id
    WHERE dm.donor_id = p_donor_id
    ORDER BY dm.applied_at DESC;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in get_donor_history: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_donor_history(UUID) IS 'Returns the complete donation request history and status for a specific donor.';
