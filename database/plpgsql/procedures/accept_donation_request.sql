CREATE OR REPLACE FUNCTION public.accept_donation_request(
    p_request_id UUID,
    p_donor_id UUID
) RETURNS public.donation_matches AS $$
DECLARE
    v_request public.donation_requests;
    v_donor public.donors;
    v_new_match public.donation_matches;
BEGIN
    -- 1. Fetch Request details
    SELECT * INTO v_request
    FROM public.donation_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation request not found.';
    END IF;

    -- 2. Fetch Donor details
    SELECT * INTO v_donor
    FROM public.donors
    WHERE id = p_donor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor profile not found.';
    END IF;

    -- 3. Validate Request Status
    IF v_request.status != 'open' THEN
        RAISE EXCEPTION 'This request is no longer accepting new donors (Status: %).', v_request.status;
    END IF;

    -- 4. Validate Donor Availability
    IF v_donor.is_available = FALSE THEN
        RAISE EXCEPTION 'Your donor profile is currently set to unavailable. Please update your profile to apply.';
    END IF;

    -- 5. Validate Rest Period
    IF v_donor.rest_period_until IS NOT NULL AND v_donor.rest_period_until > NOW() THEN
        RAISE EXCEPTION 'You are currently in a mandatory rest period until %. You cannot apply to donate right now.', v_donor.rest_period_until;
    END IF;

    -- 6. Validate Blood Group (Exact Match)
    IF v_donor.blood_group != v_request.blood_group THEN
        RAISE EXCEPTION 'Blood group mismatch. The recipient needs %, but your profile indicates you are %.', v_request.blood_group, v_donor.blood_group;
    END IF;

    -- 7. Prevent Duplicate Applications
    -- (The DDL has a UNIQUE constraint on request_id, donor_id, but catching it here gives a cleaner error)
    IF EXISTS (
        SELECT 1 FROM public.donation_matches 
        WHERE request_id = p_request_id AND donor_id = p_donor_id
    ) THEN
        RAISE EXCEPTION 'You have already applied to this donation request.';
    END IF;

    -- 8. Insert the Match Application
    INSERT INTO public.donation_matches (
        request_id,
        donor_id,
        status
    ) VALUES (
        p_request_id,
        p_donor_id,
        'pending'  -- Status required by DDL while waiting for recipient review
    ) RETURNING * INTO v_new_match;

    RETURN v_new_match;
END;
$$ LANGUAGE plpgsql;
