-- =============================================================================
-- PL/pgSQL Function: 20_get_donor_leaderboard_with_points.sql
-- Description: Returns donor leaderboard sorted by total_points DESC, complete
--              with calculated rank (overall and per blood group) and point-based badges.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_donor_leaderboard_with_points(
    p_limit INTEGER DEFAULT 10,
    p_blood_group public.blood_group DEFAULT NULL
)
RETURNS TABLE (
    donor_id UUID,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    blood_group public.blood_group,
    total_points INTEGER,
    total_donations INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    badge TEXT,
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
    WITH ranked_donors AS (
        SELECT 
            d.id AS donor_id,
            p.full_name,
            p.username,
            p.avatar_url,
            d.blood_group,
            d.total_points,
            d.total_donations,
            d.current_streak,
            d.longest_streak,
            CASE 
                WHEN d.total_points >= 500 THEN '🥇 GOLD'
                WHEN d.total_points >= 200 THEN '🥈 SILVER'
                WHEN d.total_points >= 100 THEN '🥉 BRONZE'
                WHEN d.total_points >= 50  THEN '⭐ RISING STAR'
                WHEN d.total_points >= 10  THEN '💚 ACTIVE'
                ELSE '🌱 NEW'
            END AS badge,
            RANK() OVER (ORDER BY d.total_points DESC, d.total_donations DESC) AS rank_overall,
            RANK() OVER (PARTITION BY d.blood_group ORDER BY d.total_points DESC, d.total_donations DESC) AS rank_by_blood_group
        FROM public.donors d
        JOIN public.profiles p ON p.id = d.user_id
        WHERE d.total_donations > 0
    )
    SELECT 
        rd.donor_id,
        rd.full_name,
        rd.username,
        rd.avatar_url,
        rd.blood_group,
        rd.total_points,
        rd.total_donations,
        rd.current_streak,
        rd.longest_streak,
        rd.badge,
        rd.rank_overall,
        rd.rank_by_blood_group
    FROM ranked_donors rd
    WHERE (p_blood_group IS NULL OR rd.blood_group = p_blood_group)
    ORDER BY rd.total_points DESC, rd.total_donations DESC
    LIMIT p_limit;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred while retrieving donor leaderboard with points: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_donor_leaderboard_with_points(INTEGER, public.blood_group) IS 
'Returns top donors ordered by total_points DESC, including ranks, stats, and calculated point badges.';
