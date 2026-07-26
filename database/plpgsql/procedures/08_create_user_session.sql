CREATE OR REPLACE PROCEDURE public.create_user_session(
    p_user_id UUID, 
    p_ip_address INET, 
    p_mac_address MACADDR, 
    p_user_agent TEXT,
    OUT p_session_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist.', p_user_id;
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
    RETURNING id INTO p_session_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'Failed to create user session.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in create_user_session: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.create_user_session(UUID, INET, MACADDR, TEXT) IS 'Creates a user session and returns the generated session ID.';
