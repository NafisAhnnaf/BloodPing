CREATE OR REPLACE FUNCTION public.cancel_request(
    p_request_id UUID,
    p_recipient_id UUID
) RETURNS public.donation_requests AS $$
DECLARE
    v_updated_request public.donation_requests;
BEGIN
    -- 1. Attempt to update the status to 'cancelled'
    -- The WHERE clause ensures they own it AND it's in a cancellable state
    UPDATE public.donation_requests
    SET 
        status = 'cancelled', 
        updated_at = NOW()
    WHERE id = p_request_id 
      AND recipient_id = p_recipient_id
      AND status IN ('open', 'in_progress')
    RETURNING * INTO v_updated_request;

    -- 2. If v_updated_request is NULL, the UPDATE failed to find a matching row.
    -- This means either the ID is wrong, they don't own it, or it was already fulfilled/cancelled.
    IF v_updated_request IS NULL THEN
        RAISE EXCEPTION 'Donation request not found, not owned by you, or it cannot be cancelled in its current state.';
    END IF;

    RETURN v_updated_request;
END;
$$ LANGUAGE plpgsql;
