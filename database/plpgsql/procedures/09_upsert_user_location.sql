-- =============================================================================
-- PROCEDURE: upsert_user_location
-- Description: Stores or updates user geolocation coordinates in public.user_locations
--              and synchronizes primary location with public.profiles.
-- Parameters:
--   p_user_id UUID - User ID referencing public.profiles
--   p_latitude DOUBLE PRECISION - GPS Latitude (-90 to 90)
--   p_longitude DOUBLE PRECISION - GPS Longitude (-180 to 180)
--   p_location_name TEXT - Human-readable address/city (optional)
--   p_label TEXT - Location label ('Primary', 'Home', 'Work', etc.)
--   p_source TEXT - Source of location ('browser_gps', 'nominatim_geocoded', 'manual')
--   p_accuracy_meters DOUBLE PRECISION - Accuracy in meters from browser GPS (optional)
--   p_is_primary BOOLEAN - Whether this location is the user's primary active location
-- =============================================================================

CREATE OR REPLACE PROCEDURE public.upsert_user_location(
    p_user_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_location_name TEXT DEFAULT NULL,
    p_label TEXT DEFAULT 'Primary',
    p_source TEXT DEFAULT 'browser_gps',
    p_accuracy_meters DOUBLE PRECISION DEFAULT NULL,
    p_is_primary BOOLEAN DEFAULT TRUE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_location public.GEOGRAPHY(POINT, 4326);
    v_existing_id UUID;
BEGIN
    -- 1. Validate user profile existence
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User profile with ID % does not exist.', p_user_id;
    END IF;

    -- 2. Validate latitude & longitude bounds
    IF p_latitude IS NULL OR p_longitude IS NULL THEN
        RAISE EXCEPTION 'Latitude and Longitude cannot be NULL.';
    END IF;

    IF p_latitude < -90.0 OR p_latitude > 90.0 THEN
        RAISE EXCEPTION 'Invalid latitude value: %. Must be between -90 and 90.', p_latitude;
    END IF;

    IF p_longitude < -180.0 OR p_longitude > 180.0 THEN
        RAISE EXCEPTION 'Invalid longitude value: %. Must be between -180 and 180.', p_longitude;
    END IF;

    -- 3. Construct PostGIS Geography Point (Longitude first, then Latitude for ST_MakePoint)
    v_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::public.GEOGRAPHY;

    -- 4. If setting as primary, demote existing primary locations with different labels
    IF p_is_primary = TRUE THEN
        UPDATE public.user_locations
        SET is_primary = FALSE,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND label != p_label
          AND is_primary = TRUE;
    END IF;

    -- 5. Check if record with this (user_id, label) exists
    SELECT id INTO v_existing_id
    FROM public.user_locations
    WHERE user_id = p_user_id AND label = p_label;

    IF v_existing_id IS NOT NULL THEN
        -- Update existing location entry
        UPDATE public.user_locations
        SET location = v_location,
            location_name = COALESCE(p_location_name, location_name),
            source = p_source,
            accuracy_meters = p_accuracy_meters,
            is_primary = p_is_primary,
            updated_at = NOW()
        WHERE id = v_existing_id;
    ELSE
        -- Insert new location entry
        INSERT INTO public.user_locations (
            user_id,
            label,
            location,
            location_name,
            source,
            accuracy_meters,
            is_primary,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_label,
            v_location,
            p_location_name,
            p_source,
            p_accuracy_meters,
            p_is_primary,
            NOW(),
            NOW()
        );
    END IF;

    -- 6. Synchronize with public.profiles for backward compatibility and fast lookup
    IF p_is_primary = TRUE THEN
        UPDATE public.profiles
        SET location = v_location,
            location_name = COALESCE(p_location_name, location_name),
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'upsert_user_location failed: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.upsert_user_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, DOUBLE PRECISION, BOOLEAN) 
IS 'Upserts a user geographic location into user_locations and synchronizes the primary location to profiles.';
