-- =============================================================================
-- PL/pgSQL Function: ban_user
-- Description: Allows an administrator to ban a target user, deactivate their active
--              sessions, log the ban reason, and send an account_banned notification.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ban_user(
    p_target_user_id UUID,
    p_admin_id UUID,
    p_ban_reason TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Validate administrator privileges
    IF NOT EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = p_admin_id
    ) THEN
        RAISE EXCEPTION 'Permission denied. Administrator privileges required.';
    END IF;

    -- 2. Verify target user profile exists
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_target_user_id
    ) THEN
        RAISE EXCEPTION 'Target user profile with ID % not found.', p_target_user_id;
    END IF;

    -- 3. Update profile ban tracking status
    UPDATE public.profiles
    SET is_banned = TRUE,
        ban_reason = p_ban_reason,
        banned_at = NOW(),
        banned_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- 4. Terminate all active sessions for the target user
    UPDATE public.user_sessions
    SET is_active = FALSE
    WHERE user_id = p_target_user_id;

    -- 5. Insert notification record
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type
    ) VALUES (
        p_target_user_id,
        'Account Suspended',
        'Your account has been suspended. Reason: ' || p_ban_reason,
        'account_banned'
    );

    RETURN QUERY SELECT TRUE, 'User account suspended successfully.'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in ban_user: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.ban_user(UUID, UUID, TEXT) IS 
'Bans a target user, revokes active sessions, and logs ban notification.';
