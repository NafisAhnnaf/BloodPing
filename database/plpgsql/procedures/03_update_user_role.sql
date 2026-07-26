CREATE OR REPLACE PROCEDURE public.update_user_role(
    p_user_id UUID, 
    p_new_role TEXT,
    p_blood_group public.blood_group DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    -- Validate role
    IF p_new_role NOT IN ('donor', 'recipient') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be donor or recipient.', p_new_role;
    END IF;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist.', p_user_id;
    END IF;

    IF p_new_role = 'donor' THEN
        IF p_blood_group IS NULL THEN
            RAISE EXCEPTION 'Blood group is required when registering as a donor.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.donors WHERE user_id = p_user_id) THEN
            INSERT INTO public.donors (user_id, blood_group) VALUES (p_user_id, p_blood_group);
            GET DIAGNOSTICS v_row_count = ROW_COUNT;
            IF v_row_count = 0 THEN
                RAISE EXCEPTION 'Failed to add user to donors table.';
            END IF;
        END IF;
    ELSIF p_new_role = 'recipient' THEN
        IF NOT EXISTS (SELECT 1 FROM public.recipients WHERE user_id = p_user_id) THEN
            INSERT INTO public.recipients (user_id) VALUES (p_user_id);
            GET DIAGNOSTICS v_row_count = ROW_COUNT;
            IF v_row_count = 0 THEN
                RAISE EXCEPTION 'Failed to add user to recipients table.';
            END IF;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in update_user_role: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.update_user_role(UUID, TEXT, public.blood_group) IS 'Updates or assigns a new role (donor/recipient) to a user. Requires blood_group if role is donor.';
