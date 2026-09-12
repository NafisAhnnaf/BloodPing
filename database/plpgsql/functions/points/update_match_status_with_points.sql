-- =============================================================================
-- PL/pgSQL Function: update_match_status_with_points
-- Description: Updates the status of a donation match, validates status transitions,
--              updates timestamps, and automatically awards or deducts points
--              using award_points(). Also evaluates streak/milestone bonuses on completion.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_match_status_with_points(
    p_match_id UUID,
    p_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
    match_id UUID,
    status TEXT,
    points_awarded INTEGER,
    new_total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_donor_id UUID;
    v_current_status public.donation_match_status;
    v_target_status public.donation_match_status;
    v_points_awarded INTEGER := 0;
    v_action_type TEXT := NULL;
    v_description TEXT := NULL;
    v_new_total INTEGER;
BEGIN
    -- 1. Fetch match and lock record for update
    SELECT m.donor_id, m.status 
    INTO v_donor_id, v_current_status
    FROM public.donation_matches m
    WHERE m.id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation match with ID % not found.', p_match_id;
    END IF;

    -- Cast p_status to donation_match_status enum safely
    BEGIN
        v_target_status := p_status::public.donation_match_status;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid status "%". Allowed values: pending, accepted, rejected, confirmed, no_show, withdrawn.', p_status;
    END;

    -- 2. Validate current status and transition rules
    IF v_target_status = 'confirmed' THEN
        IF v_current_status <> 'accepted' THEN
            RAISE EXCEPTION 'Invalid status transition. Match must be in "accepted" status to be confirmed (current status: %).', v_current_status;
        END IF;
        v_points_awarded := 10;
        v_action_type := 'DONATION_COMPLETED';
        v_description := 'Points awarded for completing blood donation match.';

    ELSIF v_target_status = 'withdrawn' THEN
        IF v_current_status <> 'accepted' THEN
            RAISE EXCEPTION 'Invalid status transition. Match must be in "accepted" status to be withdrawn (current status: %).', v_current_status;
        END IF;
        v_points_awarded := -5;
        v_action_type := 'CANCELLATION_PENALTY';
        v_description := 'Penalty applied for withdrawing from accepted match.';

    ELSIF v_target_status = 'no_show' THEN
        IF v_current_status <> 'accepted' THEN
            RAISE EXCEPTION 'Invalid status transition. Match must be in "accepted" status for no-show penalty (current status: %).', v_current_status;
        END IF;
        v_points_awarded := -10;
        v_action_type := 'NO_SHOW_PENALTY';
        v_description := 'Penalty applied for no-show on accepted match.';

    ELSIF v_target_status = 'rejected' THEN
        IF v_current_status <> 'pending' THEN
            RAISE EXCEPTION 'Invalid status transition. Match must be in "pending" status to be rejected (current status: %).', v_current_status;
        END IF;
        v_points_awarded := 0;

    ELSIF v_target_status = 'accepted' THEN
        IF v_current_status <> 'pending' THEN
            RAISE EXCEPTION 'Invalid status transition. Match must be in "pending" status to be accepted (current status: %).', v_current_status;
        END IF;
        v_points_awarded := 0;

    ELSE
        RAISE EXCEPTION 'Unsupported target status: %.', p_status;
    END IF;

    -- 3. Update match status, notes, and lifecycle timestamps
    UPDATE public.donation_matches
    SET status = v_target_status,
        recipient_verification_note = COALESCE(p_note, recipient_verification_note),
        accepted_at = CASE WHEN v_target_status = 'accepted' THEN NOW() ELSE accepted_at END,
        confirmed_at = CASE WHEN v_target_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
        withdrawn_at = CASE WHEN v_target_status = 'withdrawn' THEN NOW() ELSE withdrawn_at END
    WHERE id = p_match_id;

    -- 4. Call award_points if points logic applies
    IF v_action_type IS NOT NULL THEN
        SELECT a.new_total INTO v_new_total
        FROM public.award_points(
            v_donor_id,
            p_match_id,
            v_action_type,
            v_points_awarded,
            v_description
        ) a;

        -- If donation completed, also check for streak/milestone bonuses
        IF v_target_status = 'confirmed' THEN
            PERFORM public.check_streak_and_milestone_bonus(v_donor_id, p_match_id);
            
            -- Re-fetch updated total_points after potential bonuses
            SELECT d.total_points INTO v_new_total
            FROM public.donors d
            WHERE d.id = v_donor_id;
        END IF;
    ELSE
        -- No points change, fetch current total_points for donor
        SELECT d.total_points INTO v_new_total
        FROM public.donors d
        WHERE d.id = v_donor_id;
    END IF;

    RETURN QUERY
    SELECT p_match_id, v_target_status::TEXT, v_points_awarded, v_new_total;

EXCEPTION
    WHEN OTHERS THEN
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        END IF;
        RAISE EXCEPTION 'Error occurred in update_match_status_with_points: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.update_match_status_with_points(UUID, TEXT, TEXT) IS 
'Updates match status, validates state transitions, logs timestamps, and awards/deducts points automatically.';
