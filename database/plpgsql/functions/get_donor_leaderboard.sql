-- ==========================================
-- Function: get_donor_leaderboard
-- Description: Retrieves the gamified donor leaderboard, optionally filtered by blood group.
-- Returns both overall rank and blood-group specific rank based on total_donations.
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_donor_leaderboard(
    p_limit INTEGER DEFAULT 10,
    p_blood_group public.blood_group DEFAULT NULL
)
RETURNS TABLE (
    donor_id UUID,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    blood_group public.blood_group,
    total_donations INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_donation_at TIMESTAMPTZ,
    rank_overall BIGINT,
    rank_by_blood_group BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RankedDonors AS (
        SELECT 
            d.id AS donor_id,
            p.full_name,
            p.username,
            p.avatar_url,
            d.blood_group,
            d.total_donations,
            d.current_streak,
            d.longest_streak,
            d.last_donation_at,
            RANK() OVER (ORDER BY d.total_donations DESC, d.current_streak DESC) as rank_overall,
            RANK() OVER (PARTITION BY d.blood_group ORDER BY d.total_donations DESC, d.current_streak DESC) as rank_by_blood_group
        FROM public.donors d
        JOIN public.profiles p ON d.user_id = p.id
    )
    SELECT 
        rd.donor_id,
        rd.full_name,
        rd.username,
        rd.avatar_url,
        rd.blood_group,
        rd.total_donations,
        rd.current_streak,
        rd.longest_streak,
        rd.last_donation_at,
        rd.rank_overall,
        rd.rank_by_blood_group
    FROM RankedDonors rd
    WHERE p_blood_group IS NULL OR rd.blood_group = p_blood_group
    ORDER BY rd.total_donations DESC, rd.current_streak DESC
    LIMIT p_limit;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'An error occurred while fetching the donor leaderboard: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_donor_leaderboard(INTEGER, public.blood_group) IS 'Retrieves the gamified donor leaderboard, optionally filtered by blood group. Includes both overall rank and blood group specific rank.';
