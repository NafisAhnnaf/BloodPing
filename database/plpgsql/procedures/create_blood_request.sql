CREATE OR REPLACE FUNCTION public.create_blood_request(
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
    v_new_request public.donation_requests;
BEGIN
    -- 1. Validate Recipient
    IF NOT EXISTS (
        SELECT 1 FROM public.recipients 
        WHERE id = p_recipient_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Recipient does not exist or is inactive.';
    END IF;

    -- 2. Validate Units
    IF p_units_required < 1 THEN
        RAISE EXCEPTION 'Units required must be at least 1.';
    END IF;

    -- 3. Validate Date
    IF p_required_by <= NOW() THEN
        RAISE EXCEPTION 'Required by date must be in the future.';
    END IF;

    -- 4. Insert and Return
    INSERT INTO public.donation_requests (
        recipient_id,
        blood_group,
        units_required,
        hospital_name,
        hospital_location,
        hospital_address,
        search_radius_km,
        is_urgent,
        notes,
        required_by
    ) VALUES (
        p_recipient_id,
        p_blood_group,
        p_units_required,
        p_hospital_name,
        ST_SetSRID(ST_MakePoint(p_hospital_lng, p_hospital_lat), 4326)::public.GEOGRAPHY,
        p_hospital_address,
        COALESCE(p_search_radius_km, 10.00),
        COALESCE(p_is_urgent, FALSE),
        p_notes,
        p_required_by
    ) RETURNING * INTO v_new_request;

    RETURN v_new_request;
END;
$$ LANGUAGE plpgsql;
