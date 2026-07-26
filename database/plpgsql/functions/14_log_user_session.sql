CREATE OR REPLACE FUNCTION public.log_user_session(
    p_user_id UUID, 
    p_ip_address INET, 
    p_mac_address MACADDR, 
    p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id;
    END IF;

    INSERT INTO public.user_sessions (
        user_id, 
        ip_address, 
        mac_address, 
        user_agent
    ) VALUES (
        p_user_id, 
        p_ip_address, 
        p_mac_address, 
        p_user_agent
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error logging user session: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.log_user_session(UUID, INET, MACADDR, TEXT) IS 'Creates a new user session audit record and returns its ID.';
