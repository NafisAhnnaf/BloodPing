CREATE OR REPLACE FUNCTION public.get_document_status(p_donor_id UUID)
RETURNS public.document_status
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status public.document_status;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.donors WHERE id = p_donor_id) THEN
        RAISE EXCEPTION 'Donor with ID % not found', p_donor_id;
    END IF;

    SELECT status INTO v_status
    FROM public.medical_documents
    WHERE donor_id = p_donor_id
    ORDER BY uploaded_at DESC
    LIMIT 1;

    RETURN v_status;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error retrieving document status: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_document_status(UUID) IS 'Returns the most recent medical document status for a given donor.';
