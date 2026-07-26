CREATE OR REPLACE PROCEDURE public.update_document_status(
    p_document_id UUID, 
    p_status public.document_status, 
    p_reviewer_id UUID, 
    p_rejection_reason TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
    v_donor_id UUID;
BEGIN
    -- Update document status
    UPDATE public.medical_documents
    SET 
        status = p_status,
        rejection_reason = p_rejection_reason,
        reviewed_at = NOW()
    WHERE id = p_document_id
    RETURNING donor_id INTO v_donor_id;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'Medical document with ID % not found.', p_document_id;
    END IF;

    -- If approved, set donor is_platform_verified to TRUE
    IF p_status = 'approved' THEN
        UPDATE public.donors
        SET 
            is_platform_verified = TRUE,
            updated_at = NOW()
        WHERE id = v_donor_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in update_document_status: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.update_document_status(UUID, public.document_status, UUID, TEXT) IS 'Admin procedure to approve or reject a medical document and update donor verification status.';
