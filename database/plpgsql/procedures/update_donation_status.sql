CREATE OR REPLACE FUNCTION public.update_donation_status(
    p_match_id UUID,
    p_recipient_id UUID,
    p_new_status public.donation_match_status,
    p_note TEXT DEFAULT NULL
) RETURNS public.donation_matches AS $$
DECLARE
    v_updated_match public.donation_matches;
BEGIN
    -- 1. State Machine Protection
    -- Prevent bypassing the complex completion logic or donor-specific actions
    IF p_new_status = 'confirmed' THEN
        RAISE EXCEPTION 'Cannot use this function to confirm a donation. Please use the complete_match (or complete_donation) procedure instead.';
    END IF;
    
    IF p_new_status IN ('pending', 'withdrawn') THEN
        RAISE EXCEPTION 'Status "%" can only be triggered by the donor, not the recipient.', p_new_status;
    END IF;

    -- 2. Execute Update securely
    -- Only allow 'accepted', 'rejected', or 'no_show' via this generic update function
    UPDATE public.donation_matches m
    SET 
        status = p_new_status,
        recipient_verification_note = COALESCE(p_note, m.recipient_verification_note),
        -- If accepting, record the timestamp
        accepted_at = CASE WHEN p_new_status = 'accepted' AND m.accepted_at IS NULL THEN NOW() ELSE m.accepted_at END
    FROM public.donation_requests r
    WHERE m.id = p_match_id
      AND m.request_id = r.id
      AND r.recipient_id = p_recipient_id
      AND m.status NOT IN ('confirmed', 'withdrawn') -- Lock out finished states
    RETURNING m.* INTO v_updated_match;

    -- 3. Validate Success
    IF v_updated_match IS NULL THEN
        RAISE EXCEPTION 'Match not found, you do not own the parent request, or the match is permanently closed (confirmed/withdrawn).';
    END IF;

    -- Optional logic for No-Show penalties could be added here in the future:
    -- IF p_new_status = 'no_show' THEN
    --    UPDATE public.donors SET current_streak = 0 WHERE id = v_updated_match.donor_id;
    -- END IF;

    RETURN v_updated_match;
END;
$$ LANGUAGE plpgsql;
