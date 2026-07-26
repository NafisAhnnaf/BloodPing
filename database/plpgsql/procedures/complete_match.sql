CREATE OR REPLACE FUNCTION public.complete_match(
    p_match_id UUID,
    p_recipient_id UUID,
    p_donor_lat DOUBLE PRECISION DEFAULT NULL,
    p_donor_lng DOUBLE PRECISION DEFAULT NULL
) RETURNS public.donations AS $$
DECLARE
    v_match public.donation_matches;
    v_request public.donation_requests;
    v_donor public.donors;
    v_new_donation public.donations;
    v_donor_location public.GEOGRAPHY;
BEGIN
    -- 1. Fetch Match & Lock it
    -- Ensure it is currently 'accepted' (meaning the recipient approved them earlier)
    SELECT * INTO v_match
    FROM public.donation_matches
    WHERE id = p_match_id AND status = 'accepted'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found or is not in an "accepted" state ready for completion.';
    END IF;

    -- 2. Fetch Parent Request & Verify Ownership
    SELECT * INTO v_request
    FROM public.donation_requests
    WHERE id = v_match.request_id AND recipient_id = p_recipient_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'You do not own the parent donation request.';
    END IF;

    -- 3. Prevent Over-fulfillment
    -- Catch this before the DDL constraint throws an ugly error
    IF v_request.units_fulfilled >= v_request.units_required THEN
        RAISE EXCEPTION 'This request has already fulfilled all required units.';
    END IF;

    -- 4. Fetch Donor & Lock
    SELECT * INTO v_donor
    FROM public.donors
    WHERE id = v_match.donor_id
    FOR UPDATE;

    -- 5. Determine Geographic Snapshot
    -- If the frontend sends exact GPS coords, use them. Otherwise, default to the hospital's location.
    IF p_donor_lat IS NOT NULL AND p_donor_lng IS NOT NULL THEN
        v_donor_location := ST_SetSRID(ST_MakePoint(p_donor_lng, p_donor_lat), 4326)::public.GEOGRAPHY;
    ELSE
        v_donor_location := v_request.hospital_location;
    END IF;

    -- 6. UPDATE 1: Mark the match as confirmed
    UPDATE public.donation_matches
    SET status = 'confirmed', confirmed_at = NOW()
    WHERE id = p_match_id;

    -- 7. INSERT: Write the immutable audit record into `donations`
    INSERT INTO public.donations (
        match_id, donor_id, request_id, recipient_id, blood_group, donor_location
    ) VALUES (
        v_match.id, v_donor.id, v_request.id, p_recipient_id, v_donor.blood_group, v_donor_location
    ) RETURNING * INTO v_new_donation;

    -- 8. UPDATE 2: Update the Donor's Metrics and enforce rest period
    UPDATE public.donors
    SET 
        total_donations = total_donations + 1,
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_donation_at = NOW(),
        rest_period_until = NOW() + INTERVAL '90 days' -- Standard 3-month rest period for whole blood
    WHERE id = v_donor.id;

    -- 9. UPDATE 3: Increment Request units and conditionally auto-close it!
    UPDATE public.donation_requests
    SET 
        units_fulfilled = units_fulfilled + 1,
        status = CASE 
                    WHEN (units_fulfilled + 1) >= units_required THEN 'fulfilled'::public.donation_request_status 
                    ELSE status 
                 END,
        updated_at = NOW()
    WHERE id = v_request.id;

    -- Return the newly minted immutable donation record
    RETURN v_new_donation;
END;
$$ LANGUAGE plpgsql;
