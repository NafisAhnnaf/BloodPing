-- =============================================================================
-- PL/pgSQL Function: unban_user
-- Description: Allows an administrator to unban a target user and send a
--              restoration notification.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.unban_user(
    p_target_user_id UUID,
    p_admin_id UUID
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

    -- 3. Clear ban tracking status on profile
    UPDATE public.profiles
    SET is_banned = FALSE,
        ban_reason = NULL,
        banned_at = NULL,
        banned_by = NULL,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- 4. Insert account restored notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type
    ) VALUES (
        p_target_user_id,
        'Account Restored',
        'Your account has been restored.',
        'system'
    );

    RETURN QUERY SELECT TRUE, 'User account restored successfully.'::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in unban_user: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.unban_user(UUID, UUID) IS 
'Unbans a target user and sends a restoration notification.';
