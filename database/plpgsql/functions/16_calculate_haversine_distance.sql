-- =============================================================================
-- FUNCTION: calculate_haversine_distance
-- Description: Calculates spherical distance in kilometers between two lat/lng pairs
--              using the pure Haversine trigonometric formula in PL/pgSQL without PostGIS.
-- Parameters:
--   p_lat1 DOUBLE PRECISION - Origin Latitude
--   p_lng1 DOUBLE PRECISION - Origin Longitude
--   p_lat2 DOUBLE PRECISION - Destination Latitude
--   p_lng2 DOUBLE PRECISION - Destination Longitude
-- Returns: DOUBLE PRECISION - Distance in kilometers (rounded to 2 decimal places)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
    p_lat1 DOUBLE PRECISION,
    p_lng1 DOUBLE PRECISION,
    p_lat2 DOUBLE PRECISION,
    p_lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
    v_earth_radius CONSTANT DOUBLE PRECISION := 6371.0088; -- Earth mean radius in KM (WGS84 approx)
    v_dlat DOUBLE PRECISION;
    v_dlng DOUBLE PRECISION;
    v_lat1_rad DOUBLE PRECISION;
    v_lat2_rad DOUBLE PRECISION;
    v_a DOUBLE PRECISION;
    v_c DOUBLE PRECISION;
BEGIN
    -- Input boundary validation
    IF p_lat1 < -90.0 OR p_lat1 > 90.0 OR p_lat2 < -90.0 OR p_lat2 > 90.0 THEN
        RAISE EXCEPTION 'Latitude out of range [-90, 90]. Values: %, %', p_lat1, p_lat2;
    END IF;

    IF p_lng1 < -180.0 OR p_lng1 > 180.0 OR p_lng2 < -180.0 OR p_lng2 > 180.0 THEN
        RAISE EXCEPTION 'Longitude out of range [-180, 180]. Values: %, %', p_lng1, p_lng2;
    END IF;

    -- Identical points quick return
    IF p_lat1 = p_lat2 AND p_lng1 = p_lng2 THEN
        RETURN 0.0;
    END IF;

    -- Convert degrees to radians
    v_lat1_rad := radians(p_lat1);
    v_lat2_rad := radians(p_lat2);
    v_dlat := radians(p_lat2 - p_lat1);
    v_dlng := radians(p_lng2 - p_lng1);

    -- Haversine formula
    v_a := sin(v_dlat / 2.0) ^ 2.0 +
           cos(v_lat1_rad) * cos(v_lat2_rad) * (sin(v_dlng / 2.0) ^ 2.0);

    -- Clamp v_a to [0, 1] to prevent floating point domain errors in sqrt/asin
    IF v_a > 1.0 THEN
        v_a := 1.0;
    ELSIF v_a < 0.0 THEN
        v_a := 0.0;
    END IF;

    v_c := 2.0 * atan2(sqrt(v_a), sqrt(1.0 - v_a));

    RETURN ROUND((v_earth_radius * v_c)::numeric, 2)::DOUBLE PRECISION;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'calculate_haversine_distance failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.calculate_haversine_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) 
IS 'Calculates geodesic distance in kilometers between two coordinates using pure Haversine trigonometry (academic baseline).';
