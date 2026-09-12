-- =============================================================================
-- PL/pgSQL Function: award_points
-- Description: Awards or deducts points for a donor, ensures total_points >= 0,
--              updates donors table, inserts into points_history table, and
--              returns success status and the new total points.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.award_points(
    p_donor_id UUID,
    p_match_id UUID,
    p_action_type TEXT,
    p_points INTEGER,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    new_total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INTEGER;
    v_calculated_total INTEGER;
BEGIN
    -- 1. Fetch current points and lock donor record to prevent race conditions
    SELECT d.total_points INTO v_current_points
    FROM public.donors d
    WHERE d.id = p_donor_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor with ID % not found.', p_donor_id;
    END IF;

    -- 2. Validate action_type against allowed check constraint values
    IF p_action_type NOT IN (
        'DONATION_COMPLETED',
        'CANCELLATION_PENALTY',
        'NO_SHOW_PENALTY',
        'STREAK_BONUS',
        'MILESTONE_BONUS',
        'FIRST_DONATION_BONUS'
    ) THEN
        RAISE EXCEPTION 'Invalid action_type: %. Allowed values: DONATION_COMPLETED, CANCELLATION_PENALTY, NO_SHOW_PENALTY, STREAK_BONUS, MILESTONE_BONUS, FIRST_DONATION_BONUS.', p_action_type;
    END IF;

    -- 3. Calculate new total points (ensuring it never drops below 0)
    v_calculated_total := GREATEST(0, COALESCE(v_current_points, 0) + p_points);

    -- 4. Update total_points in donors table
    UPDATE public.donors
    SET total_points = v_calculated_total,
        updated_at = NOW()
    WHERE id = p_donor_id;

    -- 5. Insert record into points_history audit table
    INSERT INTO public.points_history (
        donor_id,
        match_id,
        action_type,
        points,
        description
    ) VALUES (
        p_donor_id,
        p_match_id,
        p_action_type,
        p_points,
        p_description
    );

    RETURN QUERY SELECT TRUE, v_calculated_total;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in award_points: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.award_points(UUID, UUID, TEXT, INTEGER, TEXT) IS 
'Awards or deducts points for a donor, updates total_points (never below 0), records transaction in points_history, and returns new total.';
