CREATE OR REPLACE FUNCTION public.get_donation_stats()
RETURNS TABLE (
    total_successful_donations BIGINT,
    total_active_requests BIGINT,
    total_registered_donors BIGINT,
    total_lives_impacted BIGINT
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        (SELECT COUNT(*) FROM public.donations) AS total_successful_donations,
        (SELECT COUNT(*) FROM public.donation_requests WHERE status IN ('open', 'in_progress')) AS total_active_requests,
        (SELECT COUNT(*) FROM public.donors) AS total_registered_donors,
        -- Common medical heuristic: 1 donation can save up to 3 lives
        ((SELECT COUNT(*) FROM public.donations) * 3) AS total_lives_impacted;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_donation_stats failed due to an internal error: %', SQLERRM;
END;
$$;
