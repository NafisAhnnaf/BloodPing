CREATE OR REPLACE FUNCTION public.mark_request_fulfilled(
    p_request_id UUID,
    p_recipient_id UUID
) RETURNS public.donation_requests AS $$
DECLARE
    v_updated_request public.donation_requests;
BEGIN
    -- 1. Update the status to 'fulfilled'
    -- We only allow this if the user owns it and it's not already closed
    UPDATE public.donation_requests
    SET 
        status = 'fulfilled', 
        updated_at = NOW()
    WHERE id = p_request_id 
      AND recipient_id = p_recipient_id
      AND status IN ('open', 'in_progress')
    RETURNING * INTO v_updated_request;

    -- 2. Validate Success
    IF v_updated_request IS NULL THEN
        RAISE EXCEPTION 'Request not found, not owned by you, or it cannot be marked fulfilled in its current state.';
    END IF;

    RETURN v_updated_request;
END;
$$ LANGUAGE plpgsql;
