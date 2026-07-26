CREATE OR REPLACE FUNCTION public.get_request_status(p_request_id UUID)
RETURNS TABLE (
    request_status public.donation_request_status,
    units_required SMALLINT,
    units_fulfilled SMALLINT,
    pending_donors_count INTEGER,
    accepted_donors_count INTEGER
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dr.status AS request_status,
        dr.units_required,
        dr.units_fulfilled,
        COALESCE(COUNT(dm.id) FILTER (WHERE dm.status = 'pending'), 0)::INTEGER AS pending_donors_count,
        COALESCE(COUNT(dm.id) FILTER (WHERE dm.status = 'accepted'), 0)::INTEGER AS accepted_donors_count
    FROM public.donation_requests dr
    LEFT JOIN public.donation_matches dm ON dr.id = dm.request_id
    WHERE dr.id = p_request_id
    GROUP BY dr.id, dr.status, dr.units_required, dr.units_fulfilled;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request with ID % not found', p_request_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_request_status failed due to an internal error: %', SQLERRM;
END;
$$;
