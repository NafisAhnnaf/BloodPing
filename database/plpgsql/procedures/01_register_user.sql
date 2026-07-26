-- =============================================================================
-- PROCEDURE: register_user
-- Description: Registers a new user with profile
-- Parameters:
--   p_email TEXT - User's email
--   p_password TEXT - User's password (for reference)
--   p_full_name TEXT - User's full name
--   p_username TEXT - Unique username
--   p_date_of_birth DATE - Must be 18+
--   p_phone TEXT - Optional phone number
-- Returns: p_user_id UUID
-- =============================================================================

CREATE OR REPLACE PROCEDURE public.register_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_username TEXT,
    p_date_of_birth DATE,
    OUT p_user_id UUID,        -- ← OUT parameter BEFORE DEFAULT
    p_phone TEXT DEFAULT NULL  -- ← DEFAULT parameter AFTER OUT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate age (must be 18+)
    IF p_date_of_birth > (CURRENT_DATE - INTERVAL '18 years') THEN
        RAISE EXCEPTION 'User must be at least 18 years old to register.';
    END IF;

    -- Validate username uniqueness
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
        RAISE EXCEPTION 'Username "%" is already taken.', p_username;
    END IF;

    -- Validate email uniqueness
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email "%" is already registered.', p_email;
    END IF;

    -- Generate new UUID for user
    p_user_id := gen_random_uuid();

    -- Insert into public.profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        username,
        date_of_birth,
        phone,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_full_name,
        p_username,
        p_date_of_birth,
        p_phone,
        NOW(),
        NOW()
    );

    -- Insert into donors by default
    INSERT INTO public.donors (
        user_id,
        blood_group,
        is_available,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        'O+',  -- Default blood group, user can update later
        TRUE,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'User registered successfully: %', p_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Registration failed: %', SQLERRM;
END;
$$;

COMMENT ON PROCEDURE public.register_user(TEXT, TEXT, TEXT, TEXT, DATE, TEXT) IS 
'Registers a new user with profile and default donor status. User must exist in auth.users first.';