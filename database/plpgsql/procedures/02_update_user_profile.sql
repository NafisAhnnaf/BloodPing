CREATE OR REPLACE PROCEDURE public.update_user_profile(
    p_user_id UUID, 
    p_full_name TEXT DEFAULT NULL, 
    p_username TEXT DEFAULT NULL, 
    p_phone TEXT DEFAULT NULL, 
    p_bio TEXT DEFAULT NULL, 
    p_location public.GEOGRAPHY(POINT, 4326) DEFAULT NULL, 
    p_location_name TEXT DEFAULT NULL, 
    p_avatar_url TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    UPDATE public.profiles
    SET 
        full_name = COALESCE(p_full_name, full_name),
        username = COALESCE(p_username, username),
        phone = COALESCE(p_phone, phone),
        bio = COALESCE(p_bio, bio),
        location = COALESCE(p_location, location),
        location_name = COALESCE(p_location_name, location_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = p_user_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    
    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'User profile with ID % not found.', p_user_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in update_user_profile: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, GEOGRAPHY, TEXT, TEXT) IS 'Updates specific fields in a user profile using COALESCE.';
