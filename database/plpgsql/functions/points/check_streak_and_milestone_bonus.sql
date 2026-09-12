-- =============================================================================
-- PL/pgSQL Function: check_streak_and_milestone_bonus
-- Description: Evaluates a donor's total_donations and current_streak after a
--              donation to automatically award streak bonuses (+5), milestone
--              bonuses (+20), and first donation bonuses (+15).
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_streak_and_milestone_bonus(
    p_donor_id UUID,
    p_match_id UUID DEFAULT NULL
)
RETURNS TABLE (
    bonus_points INTEGER,
    bonus_type TEXT,
    new_total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_donations INTEGER;
    v_current_streak INTEGER;
    v_res RECORD;
BEGIN
    -- 1. Fetch donor's total_donations and current_streak
    SELECT d.total_donations, d.current_streak
    INTO v_total_donations, v_current_streak
    FROM public.donors d
    WHERE d.id = p_donor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor with ID % not found.', p_donor_id;
    END IF;

    -- 2. Award FIRST_DONATION_BONUS (+15) for the 1st donation
    IF v_total_donations = 1 THEN
        SELECT * INTO v_res 
        FROM public.award_points(
            p_donor_id, 
            p_match_id, 
            'FIRST_DONATION_BONUS', 
            15, 
            'First donation bonus!'
        );
        
        bonus_points := 15;
        bonus_type := 'FIRST_DONATION_BONUS';
        new_total := v_res.new_total;
        RETURN NEXT;
    END IF;

    -- 3. Award MILESTONE_BONUS (+20) every 10 total donations
    IF v_total_donations > 0 AND v_total_donations % 10 = 0 THEN
        SELECT * INTO v_res 
        FROM public.award_points(
            p_donor_id, 
            p_match_id, 
            'MILESTONE_BONUS', 
            20, 
            'Milestone bonus for reaching ' || v_total_donations || ' total donations!'
        );
        
        bonus_points := 20;
        bonus_type := 'MILESTONE_BONUS';
        new_total := v_res.new_total;
        RETURN NEXT;
    END IF;

    -- 4. Award STREAK_BONUS (+5) every 5 consecutive donations
    IF v_current_streak > 0 AND v_current_streak % 5 = 0 THEN
        SELECT * INTO v_res 
        FROM public.award_points(
            p_donor_id, 
            p_match_id, 
            'STREAK_BONUS', 
            5, 
            'Streak bonus for reaching a ' || v_current_streak || '-donation streak!'
        );
        
        bonus_points := 5;
        bonus_type := 'STREAK_BONUS';
        new_total := v_res.new_total;
        RETURN NEXT;
    END IF;

    RETURN;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in check_streak_and_milestone_bonus: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.check_streak_and_milestone_bonus(UUID, UUID) IS 
'Evaluates and awards streak bonus (+5 every 5 donations), milestone bonus (+20 every 10 donations), and first donation bonus (+15 for 1st donation).';
