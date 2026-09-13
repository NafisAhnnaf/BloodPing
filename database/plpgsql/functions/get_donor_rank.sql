-- PL/pgSQL Function: get_donor_rank
-- Description: Retrieves overall and blood-group-specific rank and gamification metrics for a specific donor.

CREATE OR REPLACE FUNCTION public.get_donor_rank(p_donor_id uuid)
RETURNS TABLE(
    donor_id uuid,
    full_name text,
    username text,
    avatar_url text,
    blood_group blood_group,
    total_donations integer,
    current_streak integer,
    longest_streak integer,
    total_points integer,
    badge text,
    last_donation_at timestamp with time zone,
    rank_overall bigint,
    rank_by_blood_group bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH ranked_donors AS (
        SELECT 
            d.id AS donor_id,
            p.full_name,
            p.username,
            p.avatar_url,
            d.blood_group,
            d.total_donations,
            d.current_streak,
            d.longest_streak,
            d.total_points,
            CASE 
                WHEN d.total_points >= 500 THEN '🥇 GOLD'
                WHEN d.total_points >= 200 THEN '🥈 SILVER'
                WHEN d.total_points >= 100 THEN '🥉 BRONZE'
                WHEN d.total_points >= 50  THEN '⭐ RISING STAR'
                WHEN d.total_points >= 10  THEN '💚 ACTIVE'
                ELSE '🌱 NEW'
            END AS badge,
            d.last_donation_at,
            RANK() OVER (ORDER BY d.total_points DESC, d.total_donations DESC) AS rank_overall,
            RANK() OVER (PARTITION BY d.blood_group ORDER BY d.total_points DESC, d.total_donations DESC) AS rank_by_blood_group
        FROM public.donors d
        JOIN public.profiles p ON p.id = d.user_id
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
        rd.total_points,
        rd.badge,
        rd.last_donation_at,
        rd.rank_overall,
        rd.rank_by_blood_group
    FROM ranked_donors rd
    WHERE rd.donor_id = p_donor_id;
END;
$function$;

COMMENT ON FUNCTION public.get_donor_rank(UUID) IS 'Returns the rank and gamification points metrics for a specific donor.';
