CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    phone TEXT,
    bio TEXT,
    location public.GEOGRAPHY(POINT, 4326),
    location_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.full_name, p.username, p.avatar_url, p.date_of_birth, p.phone, p.bio, p.location, p.location_name, p.created_at, p.updated_at
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile with ID % not found', p_user_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in get_user_profile: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_profile(UUID) IS 'Returns the complete profile information for a given user ID.';
