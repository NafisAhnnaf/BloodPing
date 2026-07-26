CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_donor BOOLEAN;
    v_is_recipient BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.donors WHERE user_id = p_user_id) INTO v_is_donor;
    SELECT EXISTS(SELECT 1 FROM public.recipients WHERE user_id = p_user_id) INTO v_is_recipient;

    IF v_is_donor AND v_is_recipient THEN
        RETURN 'both';
    ELSIF v_is_donor THEN
        RETURN 'donor';
    ELSIF v_is_recipient THEN
        RETURN 'recipient';
    ELSE
        RETURN NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error occurred while getting user role: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Determines if a user acts as a donor, recipient, both, or neither based on records in respective tables.';
