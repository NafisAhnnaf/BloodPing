CREATE OR REPLACE PROCEDURE public.verify_donor(
    p_donor_id UUID, 
    p_admin_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    UPDATE public.donors
    SET 
        is_platform_verified = TRUE,
        updated_at = NOW()
    WHERE id = p_donor_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'Donor with ID % not found.', p_donor_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in verify_donor: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.verify_donor(UUID, UUID) IS 'Directly verifies a donor by an admin.';
