CREATE OR REPLACE PROCEDURE public.delete_user_account(p_user_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    -- Performs a hard delete on the profiles table.
    -- Due to ON DELETE CASCADE on foreign keys, this will also delete
    -- related donors, recipients, user_sessions, etc.
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    
    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'User profile with ID % not found.', p_user_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in delete_user_account: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.delete_user_account(UUID) IS 'Hard deletes a user account and relies on CASCADE to remove related records.';
