-- =============================================================================
-- PL/pgSQL Function: get_donor_documents.sql
-- Description: Retrieves all verification documents and medical records uploaded
--              by a donor (from donor_applications and medical_documents).
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_donor_documents(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    document_type TEXT,
    document_url TEXT,
    status TEXT,
    rejection_reason TEXT,
    document_date DATE,
    uploaded_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- 1. Documents from candidate donor applications
    SELECT 
        da.id,
        'Medical Clearance (Verification Application)'::TEXT AS document_type,
        da.document_url,
        da.status::TEXT,
        da.rejection_reason,
        da.created_at::DATE AS document_date,
        da.created_at AS uploaded_at,
        da.reviewed_at,
        'donor_application'::TEXT AS source
    FROM public.donor_applications da
    WHERE da.user_id = p_user_id

    UNION ALL

    -- 2. Direct records from medical_documents
    SELECT 
        md.id,
        INITCAP(REPLACE(md.document_type::TEXT, '_', ' ')) AS document_type,
        md.storage_url AS document_url,
        md.status::TEXT,
        md.rejection_reason,
        md.document_date,
        md.uploaded_at,
        md.reviewed_at,
        'medical_document'::TEXT AS source
    FROM public.medical_documents md
    INNER JOIN public.donors d ON md.donor_id = d.id
    WHERE d.user_id = p_user_id

    ORDER BY uploaded_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_donor_documents(UUID) IS 'Retrieves all medical records and verification certificates uploaded by a specific donor.';
