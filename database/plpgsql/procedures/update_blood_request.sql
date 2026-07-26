CREATE OR REPLACE FUNCTION public.update_blood_request(
    p_request_id UUID,
    p_recipient_id UUID,
    p_blood_group public.blood_group,
    p_units_required SMALLINT,
    p_hospital_name TEXT,
    p_hospital_lat DOUBLE PRECISION,
    p_hospital_lng DOUBLE PRECISION,
    p_hospital_address TEXT,
    p_search_radius_km NUMERIC(5, 2),
    p_is_urgent BOOLEAN,
    p_notes TEXT,
    p_required_by TIMESTAMPTZ
) RETURNS public.donation_requests AS $$
DECLARE
    v_current_request public.donation_requests;
    v_updated_request public.donation_requests;
BEGIN
    -- 1. Fetch current request & lock it to prevent race conditions
    SELECT * INTO v_current_request
    FROM public.donation_requests
    WHERE id = p_request_id AND recipient_id = p_recipient_id
    FOR UPDATE;

    -- 2. Validate Existence & Ownership
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donation request not found or you do not have permission to edit it.';
    END IF;

    -- 3. Validate Recipient is still Active
    IF NOT EXISTS (
        SELECT 1 FROM public.recipients 
        WHERE id = p_recipient_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Recipient account is currently inactive.';
    END IF;

    -- 4. Status Lock Check
    IF v_current_request.status NOT IN ('open', 'in_progress') THEN
        RAISE EXCEPTION 'Cannot update a request that is currently in "%" status.', v_current_request.status;
    END IF;

    -- 5. Validate Units (Trap)
    IF p_units_required < v_current_request.units_fulfilled THEN
        RAISE EXCEPTION 'Cannot reduce units_required (%) below the number of units already fulfilled (%).', p_units_required, v_current_request.units_fulfilled;
    END IF;

    IF p_units_required < 1 THEN
        RAISE EXCEPTION 'Units required must be at least 1.';
    END IF;

    -- 6. Date Validation
    IF p_required_by <= NOW() THEN
        RAISE EXCEPTION 'Required by date must be in the future.';
    END IF;

    -- 7. Execute the Update (Option A: Overwrite everything)
    UPDATE public.donation_requests
    SET 
        blood_group = p_blood_group,
        units_required = p_units_required,
        hospital_name = p_hospital_name,
        hospital_location = ST_SetSRID(ST_MakePoint(p_hospital_lng, p_hospital_lat), 4326)::public.GEOGRAPHY,
        hospital_address = p_hospital_address,
        search_radius_km = COALESCE(p_search_radius_km, 10.00),
        is_urgent = COALESCE(p_is_urgent, FALSE),
        notes = p_notes,
        required_by = p_required_by,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated_request;

    RETURN v_updated_request;
END;
$$ LANGUAGE plpgsql;
