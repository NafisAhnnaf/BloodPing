CREATE OR REPLACE FUNCTION public.get_eligible_donors(p_request_id UUID)
RETURNS TABLE (
    donor_id UUID,
    full_name TEXT,
    blood_group public.blood_group,
    distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req_hospital_location public.GEOGRAPHY;
    v_req_search_radius_km NUMERIC;
    v_req_blood_group public.blood_group;
BEGIN
    SELECT hospital_location, search_radius_km, blood_group
    INTO v_req_hospital_location, v_req_search_radius_km, v_req_blood_group
    FROM public.donation_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation request with ID % not found', p_request_id;
    END IF;

    RETURN QUERY
    SELECT 
        d.id AS donor_id,
        p.full_name,
        d.blood_group,
        (ST_Distance(p.location, v_req_hospital_location) / 1000.0) AS distance_km
    FROM public.donors d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE d.blood_group = v_req_blood_group
      AND d.is_available = true
      AND (d.rest_period_until IS NULL OR d.rest_period_until <= NOW())
      AND d.is_platform_verified = true
      AND p.location IS NOT NULL
      AND ST_DWithin(p.location, v_req_hospital_location, v_req_search_radius_km * 1000.0)
    ORDER BY distance_km ASC;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred while getting eligible donors: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_eligible_donors(UUID) IS 'Returns a list of eligible donors matching the blood group, location radius, and eligibility criteria for a specific request.';
