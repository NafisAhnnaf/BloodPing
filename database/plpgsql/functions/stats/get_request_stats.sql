CREATE OR REPLACE FUNCTION public.get_request_stats(p_request_id UUID)
RETURNS TABLE (
    units_required SMALLINT,
    units_fulfilled SMALLINT,
    total_applications INTEGER,
    pending_applications INTEGER,
    accepted_applications INTEGER,
    rejected_applications INTEGER
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dr.units_required,
        dr.units_fulfilled,
        COUNT(dm.id)::INTEGER AS total_applications,
        COUNT(dm.id) FILTER (WHERE dm.status = 'pending')::INTEGER AS pending_applications,
        COUNT(dm.id) FILTER (WHERE dm.status = 'accepted')::INTEGER AS accepted_applications,
        COUNT(dm.id) FILTER (WHERE dm.status = 'rejected')::INTEGER AS rejected_applications
    FROM public.donation_requests dr
    LEFT JOIN public.donation_matches dm ON dr.id = dm.request_id
    WHERE dr.id = p_request_id
    GROUP BY dr.id, dr.units_required, dr.units_fulfilled;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request % not found', p_request_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_request_stats failed due to an internal error: %', SQLERRM;
END;
$$;
