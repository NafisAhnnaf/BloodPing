-- =============================================================================
-- PL/pgSQL Trigger Function: award_points_on_donation
-- Description: Automatically awards +10 points (DONATION_COMPLETED) and evaluates
--              streak/milestone bonuses whenever a donation match status changes to 'confirmed'.
-- Security: SECURITY DEFINER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.award_points_on_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bonus RECORD;
BEGIN
    -- Check if status transitioned to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status <> 'confirmed') THEN
        
        -- 1 & 2. Award main donation completion points (+10 points)
        PERFORM public.award_points(
            NEW.donor_id,
            NEW.id,
            'DONATION_COMPLETED',
            10,
            'Points awarded automatically for confirmed blood donation match.'
        );
        
        RAISE NOTICE 'Awarded 10 points (DONATION_COMPLETED) to donor % for match %', NEW.donor_id, NEW.id;

        -- 3 & 4. Evaluate and award streak and milestone bonuses
        FOR v_bonus IN 
            SELECT * FROM public.check_streak_and_milestone_bonus(NEW.donor_id, NEW.id)
        LOOP
            RAISE NOTICE 'Awarded % bonus points (%) to donor % for match % (New Total: %)',
                v_bonus.bonus_points,
                v_bonus.bonus_type,
                NEW.donor_id,
                NEW.id,
                v_bonus.new_total;
        END LOOP;
        
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in award_points_on_donation trigger: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.award_points_on_donation() IS 
'Trigger function that automatically awards donation points and bonuses when a match status changes to confirmed.';

-- =============================================================================
-- CREATE TRIGGER: trg_award_points_on_donation
-- =============================================================================

DROP TRIGGER IF EXISTS trg_award_points_on_donation ON public.donation_matches;

CREATE TRIGGER trg_award_points_on_donation
AFTER UPDATE OF status ON public.donation_matches
FOR EACH ROW
WHEN (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status <> 'confirmed'))
EXECUTE FUNCTION public.award_points_on_donation();
