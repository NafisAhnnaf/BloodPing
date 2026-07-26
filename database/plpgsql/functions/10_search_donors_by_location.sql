CREATE OR REPLACE FUNCTION public.search_donors_by_location(
    p_lat DOUBLE PRECISION, 
    p_lng DOUBLE PRECISION, 
    p_radius_km NUMERIC
)
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
    v_search_point public.GEOGRAPHY(POINT, 4326);
BEGIN
    IF p_radius_km <= 0 THEN
        RAISE EXCEPTION 'Radius must be strictly positive.';
    END IF;

    v_search_point := ST_MakePoint(p_lng, p_lat)::geography;

    RETURN QUERY
    SELECT 
        d.id AS donor_id,
        p.full_name,
        d.blood_group,
        (ST_Distance(p.location, v_search_point) / 1000.0) AS distance_km
    FROM public.donors d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE d.is_available = true
      AND (d.rest_period_until IS NULL OR d.rest_period_until <= NOW())
      AND p.location IS NOT NULL
      AND ST_DWithin(p.location, v_search_point, p_radius_km * 1000.0)
    ORDER BY distance_km ASC;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error searching donors by location: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.search_donors_by_location(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC) IS 'Finds available and rested donors within a given radius from coordinate points.';
