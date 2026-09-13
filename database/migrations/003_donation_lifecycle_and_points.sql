-- =============================================================================
-- Migration: 003_donation_lifecycle_and_points.sql
-- Description: Automated triggers and routines for blood donation match lifecycle,
--              status transitions, point awards/deductions, and request fulfillment.
-- Platform: PostgreSQL / Supabase
-- =============================================================================

-- 1. Trigger function: award points, update donation stats, and fulfill requests on confirmed donation
CREATE OR REPLACE FUNCTION public.award_points_on_donation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_bonus RECORD;
    v_req RECORD;
    v_donor_user_id UUID;
    v_donor_bg public.blood_group;
BEGIN
    -- Check if status transitioned to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status <> 'confirmed') THEN
        
        -- A. Fetch Request details and Recipient User ID
        SELECT dr.id, dr.recipient_id, dr.units_required, dr.units_fulfilled, r.user_id as recipient_user_id
        INTO v_req
        FROM public.donation_requests dr
        JOIN public.recipients r ON dr.recipient_id = r.id
        WHERE dr.id = NEW.request_id;

        -- B. Fetch Donor details
        SELECT d.user_id, d.blood_group
        INTO v_donor_user_id, v_donor_bg
        FROM public.donors d
        WHERE d.id = NEW.donor_id;

        -- C. Update donor statistics (total donations, streaks, 4-month rest period)
        UPDATE public.donors
        SET total_donations = COALESCE(total_donations, 0) + 1,
            current_streak = COALESCE(current_streak, 0) + 1,
            longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1),
            last_donation_at = NOW(),
            rest_period_until = NOW() + INTERVAL '4 months',
            updated_at = NOW()
        WHERE id = NEW.donor_id;

        -- D. Update donation_requests (increment units fulfilled & check fulfillment)
        UPDATE public.donation_requests
        SET units_fulfilled = COALESCE(units_fulfilled, 0) + 1,
            status = CASE 
                WHEN COALESCE(units_fulfilled, 0) + 1 >= units_required THEN 'fulfilled'::public.donation_request_status 
                ELSE status 
            END,
            updated_at = NOW()
        WHERE id = NEW.request_id;

        -- E. Record in public.donations audit table (if not exists)
        IF NOT EXISTS (SELECT 1 FROM public.donations WHERE match_id = NEW.id) THEN
            INSERT INTO public.donations (
                match_id,
                donor_id,
                request_id,
                recipient_id,
                blood_group,
                donated_at
            ) VALUES (
                NEW.id,
                NEW.donor_id,
                NEW.request_id,
                v_req.recipient_id,
                v_donor_bg,
                NOW()
            );
        END IF;

        -- F. Award main donation completion points (+10 points)
        PERFORM public.award_points(
            NEW.donor_id,
            NEW.id,
            'DONATION_COMPLETED',
            10,
            'Points awarded automatically for confirmed blood donation match.'
        );
        
        -- G. Evaluate and award streak and milestone bonuses
        FOR v_bonus IN 
            SELECT * FROM public.check_streak_and_milestone_bonus(NEW.donor_id, NEW.id)
        LOOP
            RAISE NOTICE 'Awarded % bonus points (%) to donor % for match %',
                v_bonus.bonus_points,
                v_bonus.bonus_type,
                NEW.donor_id,
                NEW.id;
        END LOOP;

        -- H. Send system notifications
        IF v_donor_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                v_donor_user_id,
                'Donation Confirmed!',
                'Thank you! Your blood donation has been confirmed by the recipient. You earned 10 points!',
                'system'
            );
        END IF;

        IF v_req.recipient_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                v_req.recipient_user_id,
                'Donation Fulfilled',
                'Blood donation marked as complete. Thank you for using BloodPing!',
                'system'
            );
        END IF;
        
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in award_points_on_donation trigger: %', SQLERRM;
END;
$function$;

-- Ensure trigger is active on donation_matches
DROP TRIGGER IF EXISTS trg_award_points_on_donation ON public.donation_matches;
CREATE TRIGGER trg_award_points_on_donation
AFTER UPDATE OF status ON public.donation_matches
FOR EACH ROW
EXECUTE FUNCTION public.award_points_on_donation();

-- 2. Stored procedure: update_match_status_with_points
CREATE OR REPLACE FUNCTION public.update_match_status_with_points(p_match_id uuid, p_status text, p_note text DEFAULT NULL::text)
 RETURNS TABLE(match_id uuid, status text, points_awarded integer, new_total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_donor_id UUID;
    v_donor_user_id UUID;
    v_recipient_user_id UUID;
    v_req_hospital TEXT;
    v_current_status public.donation_match_status;
    v_target_status public.donation_match_status;
    v_points_awarded INTEGER := 0;
    v_action_type TEXT := NULL;
    v_description TEXT := NULL;
    v_new_total INTEGER;
BEGIN
    -- 1. Fetch match and associated request/user info
    SELECT 
        m.donor_id, 
        m.status,
        d.user_id as donor_user_id,
        r.user_id as recipient_user_id,
        dr.hospital_name
    INTO 
        v_donor_id, 
        v_current_status,
        v_donor_user_id,
        v_recipient_user_id,
        v_req_hospital
    FROM public.donation_matches m
    JOIN public.donors d ON m.donor_id = d.id
    JOIN public.donation_requests dr ON m.request_id = dr.id
    JOIN public.recipients r ON dr.recipient_id = r.id
    WHERE m.id = p_match_id
    FOR UPDATE OF m;

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

    -- 3. Update match status, notes, and lifecycle timestamps (fires trg_award_points_on_donation when confirmed)
    UPDATE public.donation_matches
    SET status = v_target_status,
        recipient_verification_note = COALESCE(p_note, recipient_verification_note),
        accepted_at = CASE WHEN v_target_status = 'accepted' THEN NOW() ELSE accepted_at END,
        confirmed_at = CASE WHEN v_target_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
        withdrawn_at = CASE WHEN v_target_status = 'withdrawn' THEN NOW() ELSE withdrawn_at END
    WHERE id = p_match_id;

    -- 4. Execute points logic for withdrawal penalty or no-show penalty
    IF v_action_type IS NOT NULL AND v_target_status <> 'confirmed' THEN
        SELECT a.new_total INTO v_new_total
        FROM public.award_points(
            v_donor_id,
            p_match_id,
            v_action_type,
            v_points_awarded,
            v_description
        ) a;

        -- Reset streak on cancellation or no-show penalty
        UPDATE public.donors
        SET current_streak = 0,
            updated_at = NOW()
        WHERE id = v_donor_id;

        -- Notify recipient that donor withdrew
        IF v_recipient_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                v_recipient_user_id,
                'Donor Withdrew Application',
                'A donor had to cancel their accepted application for ' || COALESCE(v_req_hospital, 'your request') || '. Your request remains open for others.',
                'system'
            );
        END IF;
    ELSE
        SELECT d.total_points INTO v_new_total
        FROM public.donors d
        WHERE d.id = v_donor_id;
    END IF;

    -- 5. Notifications for Accepted or Rejected
    IF v_target_status = 'accepted' AND v_donor_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_donor_user_id,
            'Application Accepted!',
            'Your application to donate at ' || COALESCE(v_req_hospital, 'the hospital') || ' has been accepted. Please coordinate with the recipient!',
            'system'
        );
    ELSIF v_target_status = 'rejected' AND v_donor_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            v_donor_user_id,
            'Application Update',
            'Your application to donate at ' || COALESCE(v_req_hospital, 'the hospital') || ' was not selected this time. Thank you for your willingness to help!',
            'system'
        );
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
$function$;
