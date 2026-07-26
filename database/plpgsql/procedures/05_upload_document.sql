CREATE OR REPLACE PROCEDURE public.upload_document(
    p_donor_id UUID, 
    p_document_type public.document_type, 
    p_storage_url TEXT, 
    p_document_date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_row_count INTEGER;
BEGIN
    -- Validate document date
    IF p_document_date < (CURRENT_DATE - INTERVAL '4 months') THEN
        RAISE EXCEPTION 'Document date % is older than 4 months.', p_document_date;
    END IF;

    -- Verify donor exists
    IF NOT EXISTS (SELECT 1 FROM public.donors WHERE id = p_donor_id) THEN
        RAISE EXCEPTION 'Donor with ID % does not exist.', p_donor_id;
    END IF;

    -- Insert document
    INSERT INTO public.medical_documents (
        donor_id,
        document_type,
        storage_url,
        document_date,
        status
    ) VALUES (
        p_donor_id,
        p_document_type,
        p_storage_url,
        p_document_date,
        'pending_review'
    );

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count = 0 THEN
        RAISE EXCEPTION 'Failed to upload document.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error in upload_document: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.upload_document(UUID, public.document_type, TEXT, DATE) IS 'Uploads a medical document for a donor, validating its freshness.';
