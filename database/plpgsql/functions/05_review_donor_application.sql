CREATE OR REPLACE FUNCTION public.review_donor_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_status TEXT,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
    v_blood_group public.blood_group;
    v_travel_radius NUMERIC(5,2);
BEGIN
    -- Verify reviewer is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = p_admin_id
    ) THEN
        RAISE EXCEPTION 'Only platform administrators can review donor applications.';
    END IF;

    -- Fetch candidate details
    SELECT user_id, blood_group, travel_radius_km
    INTO v_user_id, v_blood_group, v_travel_radius
    FROM public.donor_applications
    WHERE id = p_application_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor application not found.';
    END IF;

    -- Update application status
    UPDATE public.donor_applications
    SET status = p_status::public.application_status,
        rejection_reason = p_rejection_reason,
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_application_id;

    -- If approved, insert or update the donors table and send notification
    IF p_status = 'approved' THEN
        INSERT INTO public.donors (user_id, blood_group, travel_radius_km)
        VALUES (v_user_id, v_blood_group, v_travel_radius)
        ON CONFLICT (user_id) DO UPDATE SET
            blood_group = EXCLUDED.blood_group,
            travel_radius_km = EXCLUDED.travel_radius_km,
            updated_at = NOW();

        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type
        ) VALUES (
            v_user_id,
            'Donor Application Approved',
            'Congratulations! Your donor application has been approved.',
            'application_approved'
        );
    ELSIF p_status = 'rejected' THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type
        ) VALUES (
            v_user_id,
            'Donor Application Rejected',
            'Your donor application was rejected. Reason: ' || COALESCE(p_rejection_reason, 'Not specified'),
            'application_rejected'
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION public.review_donor_application(UUID, UUID, TEXT, TEXT) IS 'Allows administrators to approve or reject candidate donor applications, transferring verified profiles to the donors table.';
