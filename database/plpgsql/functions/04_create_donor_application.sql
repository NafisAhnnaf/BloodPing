CREATE OR REPLACE FUNCTION public.create_donor_application(
    p_user_id UUID,
    p_blood_group public.blood_group,
    p_travel_radius_km NUMERIC,
    p_document_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_app_id UUID;
BEGIN
    -- Check if user already has a pending application
    IF EXISTS (
        SELECT 1 FROM public.donor_applications 
        WHERE user_id = p_user_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'A pending donor application already exists for this user.';
    END IF;

    INSERT INTO public.donor_applications (
        user_id, blood_group, travel_radius_km, document_url, status
    ) VALUES (
        p_user_id, p_blood_group, p_travel_radius_km, p_document_url, 'pending'
    )
    RETURNING id INTO v_app_id;

    RETURN v_app_id;
END;
$$;

COMMENT ON FUNCTION public.create_donor_application(UUID, public.blood_group, NUMERIC, TEXT) IS 'Creates a new donor application for a user after performing validation checks.';
