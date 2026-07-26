CREATE OR REPLACE FUNCTION public.get_donor_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    donor_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    blood_group public.blood_group,
    total_donations INTEGER,
    rank_overall BIGINT,
    rank_by_blood_group BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_limit <= 0 THEN
        RAISE EXCEPTION 'Limit must be greater than zero.';
    END IF;

    RETURN QUERY
    SELECT 
        l.donor_id,
        l.full_name,
        l.avatar_url,
        l.blood_group,
        l.total_donations,
        l.rank_overall,
        l.rank_by_blood_group
    FROM public.leaderboard l
    ORDER BY l.rank_overall ASC
    LIMIT p_limit;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred while getting leaderboard: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_donor_leaderboard(INTEGER) IS 'Returns the top donors globally from the leaderboard materialized view.';
