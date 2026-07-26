CREATE OR REPLACE FUNCTION public.validate_document_age(p_document_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_document_date IS NULL THEN
        RAISE EXCEPTION 'Document date cannot be null';
    END IF;

    RETURN p_document_date >= (CURRENT_DATE - INTERVAL '4 months');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error validating document age: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.validate_document_age(DATE) IS 'Checks if a provided document date is within the acceptable 4-month freshness period.';
