CREATE OR REPLACE FUNCTION public.get_all_donation_requests()
RETURNS TABLE (
    request_id UUID,
    blood_group public.blood_group,
    units_required SMALLINT,
    units_fulfilled SMALLINT,
    hospital_name TEXT,
    hospital_lat DOUBLE PRECISION,
    hospital_lng DOUBLE PRECISION,
    hospital_address TEXT,
    search_radius_km NUMERIC(5,2),
    is_urgent BOOLEAN,
    notes TEXT,
    required_by TIMESTAMPTZ,
    status public.donation_request_status,
    created_at TIMESTAMPTZ,
    recipient_name TEXT,
    recipient_phone TEXT
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dr.id AS request_id,
        dr.blood_group,
        dr.units_required,
        dr.units_fulfilled,
        dr.hospital_name,
        ST_Y(dr.hospital_location::geometry) AS hospital_lat,
        ST_X(dr.hospital_location::geometry) AS hospital_lng,
        dr.hospital_address,
        dr.search_radius_km,
        dr.is_urgent,
        dr.notes,
        dr.required_by,
        dr.status,
        dr.created_at,
        p.full_name AS recipient_name,
        p.phone AS recipient_phone
    FROM public.donation_requests dr
    INNER JOIN public.recipients r ON dr.recipient_id = r.id
    INNER JOIN public.profiles p ON r.user_id = p.id
    ORDER BY dr.created_at DESC;
END;
$$;
