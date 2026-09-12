-- =============================================================================
-- PL/pgSQL Function: get_donor_points
-- Description: Retrieves total_points, total_donations, total_penalties,
--              current_streak, and the last 20 history entries formatted as JSONB
--              for a specific donor.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_donor_points(p_donor_id UUID)
RETURNS TABLE (
    total_points INTEGER,
    total_donations INTEGER,
    total_penalties INTEGER,
    current_streak INTEGER,
    points_history JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_points INTEGER;
    v_total_donations INTEGER;
    v_current_streak INTEGER;
    v_total_penalties INTEGER;
    v_history_json JSONB;
BEGIN
    -- 1. Get metrics from donors table
    SELECT 
        d.total_points, 
        d.total_donations, 
        d.current_streak
    INTO 
        v_total_points, 
        v_total_donations, 
        v_current_streak
    FROM public.donors d
    WHERE d.id = p_donor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor with ID % not found.', p_donor_id;
    END IF;

    -- 2. Count total penalty occurrences (CANCELLATION_PENALTY or NO_SHOW_PENALTY)
    SELECT COALESCE(COUNT(*), 0)
    INTO v_total_penalties
    FROM public.points_history ph
    WHERE ph.donor_id = p_donor_id
      AND ph.action_type IN ('CANCELLATION_PENALTY', 'NO_SHOW_PENALTY');

    -- 3. Fetch last 20 points history entries as a JSONB array
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', h.id,
                'match_id', h.match_id,
                'action_type', h.action_type,
                'points', h.points,
                'description', h.description,
                'created_at', h.created_at
            ) ORDER BY h.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_history_json
    FROM (
        SELECT ph.id, ph.match_id, ph.action_type, ph.points, ph.description, ph.created_at
        FROM public.points_history ph
        WHERE ph.donor_id = p_donor_id
        ORDER BY ph.created_at DESC
        LIMIT 20
    ) h;

    RETURN QUERY
    SELECT 
        v_total_points, 
        v_total_donations, 
        v_total_penalties, 
        v_current_streak, 
        v_history_json;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in get_donor_points: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_donor_points(UUID) IS 
'Returns donor points summary, total donations, penalties count, streak, and last 20 points history items as JSONB.';
