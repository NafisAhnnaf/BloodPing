CREATE OR REPLACE FUNCTION public.count_nearby_donors(
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_radius_km NUMERIC,
    p_blood_group public.blood_group
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_donor_count INTEGER;
BEGIN
    SELECT COUNT(d.id)::INTEGER
    INTO v_donor_count
    FROM public.donors d
    INNER JOIN public.profiles p ON d.user_id = p.id
    WHERE d.blood_group = p_blood_group
      AND d.is_available = TRUE
      AND p.location IS NOT NULL
      AND ST_DWithin(
          p.location,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
          p_radius_km * 1000
      );

    RETURN COALESCE(v_donor_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'count_nearby_donors failed due to an internal error: %', SQLERRM;
END;
$$;
