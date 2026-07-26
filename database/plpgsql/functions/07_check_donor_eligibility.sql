CREATE OR REPLACE FUNCTION public.check_donor_eligibility(p_donor_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_eligible BOOLEAN;
BEGIN
    SELECT (is_available = true 
            AND (rest_period_until IS NULL OR rest_period_until <= NOW()) 
            AND is_platform_verified = true)
    INTO v_is_eligible
    FROM public.donors
    WHERE id = p_donor_id;

    IF v_is_eligible IS NULL THEN
        RAISE EXCEPTION 'Donor with ID % not found', p_donor_id;
    END IF;

    RETURN v_is_eligible;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE; 
        END IF;
        RAISE EXCEPTION 'Error occurred while checking donor eligibility: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.check_donor_eligibility(UUID) IS 'Checks if a donor is currently eligible to donate (available, not resting, and platform verified).';
