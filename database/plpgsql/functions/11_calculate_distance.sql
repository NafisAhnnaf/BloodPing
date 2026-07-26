CREATE OR REPLACE FUNCTION public.calculate_distance(
    p_lat1 DOUBLE PRECISION, 
    p_lng1 DOUBLE PRECISION, 
    p_lat2 DOUBLE PRECISION, 
    p_lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point1 public.GEOGRAPHY(POINT, 4326);
    v_point2 public.GEOGRAPHY(POINT, 4326);
    v_distance_km DOUBLE PRECISION;
BEGIN
    v_point1 := ST_MakePoint(p_lng1, p_lat1)::geography;
    v_point2 := ST_MakePoint(p_lng2, p_lat2)::geography;
    
    v_distance_km := ST_Distance(v_point1, v_point2) / 1000.0;
    
    RETURN v_distance_km;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error calculating distance: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.calculate_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS 'Calculates the distance in kilometers between two geographic coordinate pairs.';
