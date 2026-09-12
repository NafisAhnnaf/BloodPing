-- =============================================================================
-- FUNCTION: get_personalized_feed
-- Description: Retrieves an intelligent, proximity-ranked blood donation feed.
-- Algorithm:
--   1. Dynamic Coordinate Resolution: Uses live client coordinates (p_user_lat, p_user_lng)
--      if provided, else resolves primary location from public.user_locations,
--      falling back to public.profiles.
--   2. Effective Search Radius: Uses p_max_radius_km if given, else donor's travel_radius_km,
--      falling back to 25.0 km default.
--   3. Spatial Filtering: Applies ST_DWithin on the GiST spatial index.
--   4. Tiered Proximity Ranking:
--      - Tier 1: Urgent requests within 25 km jump to the top.
--      - Tier 2: Proximity sorting (nearest requests first).
--      - Tier 3: Recency ordering for tie-breaking.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
    p_user_id UUID DEFAULT NULL,
    p_user_lat DOUBLE PRECISION DEFAULT NULL,
    p_user_lng DOUBLE PRECISION DEFAULT NULL,
    p_max_radius_km NUMERIC DEFAULT NULL,
    p_blood_group_filter public.blood_group DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    request_id UUID,
    blood_group public.blood_group,
    units_required SMALLINT,
    units_fulfilled SMALLINT,
    hospital_name TEXT,
    hospital_lat DOUBLE PRECISION,
    hospital_lng DOUBLE PRECISION,
    hospital_address TEXT,
    search_radius_km NUMERIC(5,2),
    is_urgent BOOLEAN,
    notes TEXT,
    required_by TIMESTAMPTZ,
    status public.donation_request_status,
    created_at TIMESTAMPTZ,
    recipient_name TEXT,
    recipient_phone TEXT,
    distance_km DOUBLE PRECISION,
    match_score DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_user_location public.GEOGRAPHY(POINT, 4326);
    v_donor_blood public.blood_group;
    v_donor_travel_radius NUMERIC(5,2);
    v_effective_radius_km NUMERIC(5,2);
BEGIN
    -- 1. Determine user reference point
    IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
        -- Validate coordinates
        IF p_user_lat BETWEEN -90.0 AND 90.0 AND p_user_lng BETWEEN -180.0 AND 180.0 THEN
            v_user_location := ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::public.GEOGRAPHY;
        END IF;
    END IF;

    -- If live coordinates not provided or invalid, resolve from user_locations or profiles
    IF v_user_location IS NULL AND p_user_id IS NOT NULL THEN
        -- Check normalized user_locations table first
        SELECT ul.location INTO v_user_location
        FROM public.user_locations ul
        WHERE ul.user_id = p_user_id AND ul.is_primary = TRUE
        ORDER BY ul.updated_at DESC
        LIMIT 1;

        -- Fallback to profiles table
        IF v_user_location IS NULL THEN
            SELECT pr.location INTO v_user_location
            FROM public.profiles pr
            WHERE pr.id = p_user_id;
        END IF;
    END IF;

    -- 2. Fetch donor preferences (blood group and travel radius)
    IF p_user_id IS NOT NULL THEN
        SELECT dn.blood_group, dn.travel_radius_km
        INTO v_donor_blood, v_donor_travel_radius
        FROM public.donors dn
        WHERE dn.user_id = p_user_id;
    END IF;

    -- 3. Determine effective search radius: explicit param -> donor's travel radius -> 25km default
    IF p_max_radius_km IS NOT NULL AND p_max_radius_km > 0 THEN
        v_effective_radius_km := p_max_radius_km;
    ELSIF v_donor_travel_radius IS NOT NULL AND v_donor_travel_radius > 0 THEN
        v_effective_radius_km := v_donor_travel_radius;
    ELSE
        v_effective_radius_km := 25.0;
    END IF;

    -- 4. Query and rank requests
    -- Attempt 1: Proximity-based search within user radius
    IF v_user_location IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            dr.id AS request_id,
            dr.blood_group,
            dr.units_required,
            dr.units_fulfilled,
            dr.hospital_name,
            ST_Y(dr.hospital_location::geometry) AS hospital_lat,
            ST_X(dr.hospital_location::geometry) AS hospital_lng,
            dr.hospital_address,
            dr.search_radius_km,
            dr.is_urgent,
            dr.notes,
            dr.required_by,
            dr.status,
            dr.created_at,
            p.full_name AS recipient_name,
            p.phone AS recipient_phone,
            ROUND((ST_Distance(dr.hospital_location, v_user_location) / 1000.0)::numeric, 2)::DOUBLE PRECISION AS distance_km,
            (
                GREATEST(0.0, 100.0 - (ST_Distance(dr.hospital_location, v_user_location) / 1000.0) * 2.0)
                + (CASE WHEN dr.is_urgent THEN 40.0 ELSE 0.0 END)
                + (CASE WHEN v_donor_blood IS NOT NULL AND dr.blood_group = v_donor_blood THEN 25.0 ELSE 0.0 END)
                + (CASE WHEN dr.created_at >= NOW() - INTERVAL '24 hours' THEN 10.0 ELSE 0.0 END)
            )::DOUBLE PRECISION AS match_score
        FROM public.donation_requests dr
        INNER JOIN public.recipients r ON dr.recipient_id = r.id
        INNER JOIN public.profiles p ON r.user_id = p.id
        WHERE dr.status = 'open'::public.donation_request_status
          AND dr.required_by > NOW()
          AND (p_blood_group_filter IS NULL OR dr.blood_group = p_blood_group_filter)
          AND ST_DWithin(dr.hospital_location, v_user_location, v_effective_radius_km * 1000.0)
        ORDER BY 
            CASE 
                WHEN dr.is_urgent AND ((ST_Distance(dr.hospital_location, v_user_location) / 1000.0) <= 25.0) 
                THEN 0 
                ELSE 1 
            END ASC,
            (ST_Distance(dr.hospital_location, v_user_location) / 1000.0) ASC,
            dr.required_by DESC,
            dr.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;

        -- If matching requests were found on proximity basis, return them
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Attempt 2 (Fallback): If no requests were found on proximity basis (or no user location),
    -- fall back to showing all active requests ordered by latest deadline first
    RETURN QUERY
    SELECT 
        dr.id AS request_id,
        dr.blood_group,
        dr.units_required,
        dr.units_fulfilled,
        dr.hospital_name,
        ST_Y(dr.hospital_location::geometry) AS hospital_lat,
        ST_X(dr.hospital_location::geometry) AS hospital_lng,
        dr.hospital_address,
        dr.search_radius_km,
        dr.is_urgent,
        dr.notes,
        dr.required_by,
        dr.status,
        dr.created_at,
        p.full_name AS recipient_name,
        p.phone AS recipient_phone,
        CASE 
            WHEN v_user_location IS NOT NULL THEN 
                ROUND((ST_Distance(dr.hospital_location, v_user_location) / 1000.0)::numeric, 2)::DOUBLE PRECISION
            ELSE 0.0::DOUBLE PRECISION
        END AS distance_km,
        (
            CASE 
                WHEN v_user_location IS NOT NULL THEN 
                    GREATEST(0.0, 100.0 - (ST_Distance(dr.hospital_location, v_user_location) / 1000.0) * 2.0)
                ELSE 50.0 
            END
            + (CASE WHEN dr.is_urgent THEN 40.0 ELSE 0.0 END)
            + (CASE WHEN v_donor_blood IS NOT NULL AND dr.blood_group = v_donor_blood THEN 25.0 ELSE 0.0 END)
            + (CASE WHEN dr.created_at >= NOW() - INTERVAL '24 hours' THEN 10.0 ELSE 0.0 END)
        )::DOUBLE PRECISION AS match_score
    FROM public.donation_requests dr
    INNER JOIN public.recipients r ON dr.recipient_id = r.id
    INNER JOIN public.profiles p ON r.user_id = p.id
    WHERE dr.status = 'open'::public.donation_request_status
      AND dr.required_by > NOW()
      AND (p_blood_group_filter IS NULL OR dr.blood_group = p_blood_group_filter)
    ORDER BY 
        dr.required_by DESC,
        dr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'get_personalized_feed failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_personalized_feed(UUID, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, public.blood_group, INTEGER, INTEGER)
IS 'Returns a proximity-ranked, geospatial blood donation feed utilizing PostGIS and GiST spatial indexes.';
