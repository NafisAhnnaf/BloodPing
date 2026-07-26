CREATE OR REPLACE FUNCTION public.check_user_exists(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_exists;
    RETURN v_exists;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error occurred while checking user existence: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.check_user_exists(UUID) IS 'Checks if a user profile exists for the given user ID.';
