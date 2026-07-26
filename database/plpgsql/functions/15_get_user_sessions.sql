CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    session_id UUID,
    ip_address INET,
    mac_address MACADDR,
    created_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_limit <= 0 THEN
        RAISE EXCEPTION 'Limit must be greater than zero.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id;
    END IF;

    RETURN QUERY
    SELECT 
        id AS session_id,
        s.ip_address,
        s.mac_address,
        s.created_at,
        s.last_active_at,
        s.is_active
    FROM public.user_sessions s
    WHERE s.user_id = p_user_id
    ORDER BY s.last_active_at DESC
    LIMIT p_limit;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error retrieving user sessions: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_sessions(UUID, INTEGER) IS 'Returns recent session records for a user, useful for security audits.';
