CREATE OR REPLACE FUNCTION public.get_donor_stats(p_donor_id UUID)
RETURNS TABLE (
    total_donations INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_donation_at TIMESTAMPTZ,
    rest_period_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT d.total_donations, d.current_streak, d.longest_streak, d.last_donation_at, d.rest_period_until
    FROM public.donors d
    WHERE d.id = p_donor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor with ID % not found', p_donor_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in get_donor_stats: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_donor_stats(UUID) IS 'Returns the gamification stats and rest period status for a specific donor.';
