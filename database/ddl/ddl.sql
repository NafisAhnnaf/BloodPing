-- =============================================================================
-- BLOODPING — Complete Database Schema & PL/pgSQL DDL
-- Platform: PostgreSQL via Supabase (PostGIS enabled)
-- Auth: Supabase Auth (auth.users is the identity source of truth)
-- Paradigm: Database-First / Heavy Backend Automation
-- =============================================================================

-- =============================================================================
-- 1. DATABASE EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- =============================================================================
-- 2. CUSTOM SYSTEM ENUMS
-- =============================================================================
CREATE TYPE public.blood_group AS ENUM (
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);

CREATE TYPE public.donation_request_status AS ENUM (
    'open',         -- accepting donor applications
    'in_progress',  -- at least one donor matched, still needs more units
    'fulfilled',    -- all required units confirmed by recipient
    'cancelled',    -- cancelled by recipient
    'expired'       -- past deadline with no fulfillment
);

CREATE TYPE public.donation_match_status AS ENUM (
    'pending',      -- donor applied, waiting for recipient to verify docs
    'accepted',     -- recipient verified docs and accepted donor
    'rejected',     -- recipient rejected donor
    'confirmed',    -- recipient confirmed donation completed
    'no_show',      -- donor accepted but did not appear
    'withdrawn'     -- donor withdrew before confirmation
);

CREATE TYPE public.document_type AS ENUM (
    'medical_certificate',
    'blood_test_report',
    'identity_proof',
    'other'
);

CREATE TYPE public.document_status AS ENUM (
    'pending_review',   -- just uploaded, platform initial check pending
    'approved',         -- platform approved, donor can accept requests
    'rejected',         -- platform rejected, needs re-upload
    'expired'           -- older than 4 months, must re-upload
);

CREATE TYPE public.invite_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired'
);

-- =============================================================================
-- 3. CORE IDENTITY & USER ACCESS TABLES
-- =============================================================================

-- Table: public.profiles (Extends Supabase auth.users)
CREATE TABLE public.profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT NOT NULL,
    username            TEXT UNIQUE NOT NULL,
    avatar_url          TEXT,                           -- Supabase Storage URL
    date_of_birth       DATE NOT NULL,                  -- 18+ checked via trigger
    phone               TEXT,
    bio                 TEXT,
    location            public.GEOGRAPHY(POINT, 4326),  -- PostGIS point (GPS lat/lng)
    location_name       TEXT,                           -- Human readable: "Dhaka, BD"
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.user_sessions (Hardware and IP Audit Logging)
CREATE TABLE public.user_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address          INET NOT NULL,                  -- Supports IPv4 or IPv6
    mac_address         MACADDR,                        -- Client interface physical address
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: public.donors (Donor Profile Toggles and Metrics)
CREATE TABLE public.donors (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_group             public.blood_group NOT NULL,
    is_available            BOOLEAN NOT NULL DEFAULT TRUE,     -- Manually toggled by donor
    rest_period_until       TIMESTAMPTZ,                       -- Enforced dynamically via trigger
    is_platform_verified    BOOLEAN NOT NULL DEFAULT FALSE,    -- Verification layer status
    travel_radius_km        NUMERIC(5, 2) NOT NULL DEFAULT 10,
    total_donations         INTEGER NOT NULL DEFAULT 0 CHECK (total_donations >= 0),
    current_streak          INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak          INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_donation_at        TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.recipients (Recipient Control Privileges)
CREATE TABLE public.recipients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,      -- Allows admins to freeze requesting privileges
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. MEDICAL LEDGER & LOGISTICS TABLES
-- =============================================================================

-- Table: public.medical_documents (Document Storage Trackers)
CREATE TABLE public.medical_documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id            UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
    document_type       public.document_type NOT NULL,
    storage_url         TEXT NOT NULL,                  -- Supabase Storage reference path
    document_date       DATE NOT NULL,                  -- Date printed on physical document
    status              public.document_status NOT NULL DEFAULT 'pending_review',
    rejection_reason    TEXT,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ,
    -- Freshness check at upload entry: document itself cannot be older than 4 months
    CONSTRAINT chk_document_freshness CHECK (
        document_date >= (CURRENT_DATE - INTERVAL '4 months')
    )
);

-- Table: public.donation_requests (Targeted Emergency Requests)
CREATE TABLE public.donation_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id        UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
    blood_group         public.blood_group NOT NULL,
    units_required      SMALLINT NOT NULL DEFAULT 1 CHECK (units_required >= 1),
    units_fulfilled     SMALLINT NOT NULL DEFAULT 0,
    hospital_name       TEXT NOT NULL,
    hospital_location   public.GEOGRAPHY(POINT, 4326) NOT NULL,
    hospital_address    TEXT NOT NULL,
    search_radius_km    NUMERIC(5, 2) NOT NULL DEFAULT 10,
    notes               TEXT,
    required_by         TIMESTAMPTZ NOT NULL,           -- Ticket active time constraint
    status              public.donation_request_status NOT NULL DEFAULT 'open',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_units_fulfilled CHECK (units_fulfilled <= units_required),
    CONSTRAINT chk_required_by_future CHECK (required_by > created_at)
);

-- Table: public.donation_matches (Donor-Request Connection Ledger)
CREATE TABLE public.donation_matches (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id                  UUID NOT NULL REFERENCES public.donation_requests(id) ON DELETE CASCADE,
    donor_id                    UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
    status                      public.donation_match_status NOT NULL DEFAULT 'pending',
    recipient_verification_note TEXT,
    applied_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at                 TIMESTAMPTZ,
    confirmed_at                TIMESTAMPTZ,
    withdrawn_at                TIMESTAMPTZ,
    UNIQUE (request_id, donor_id)
);

-- Table: public.donor_invitations (Direct Targeting Pipeline)
CREATE TABLE public.donor_invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL REFERENCES public.donation_requests(id) ON DELETE CASCADE,
    donor_id        UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
    invited_by      UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
    status          public.invite_status NOT NULL DEFAULT 'pending',
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at    TIMESTAMPTZ,
    UNIQUE (request_id, donor_id)
);

-- Table: public.donations (Immutable Audit Ledger)
CREATE TABLE public.donations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id        UUID NOT NULL UNIQUE REFERENCES public.donation_matches(id),
    donor_id        UUID NOT NULL REFERENCES public.donors(id),
    request_id      UUID NOT NULL REFERENCES public.donation_requests(id),
    recipient_id    UUID NOT NULL REFERENCES public.recipients(id),
    blood_group     public.blood_group NOT NULL,
    donated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    donor_location  public.GEOGRAPHY(POINT, 4326)       -- Geometric snapshot for analytical engines
);

-- =============================================================================
-- 5. ANALYTICAL WORKLOADS & VIEWS
-- =============================================================================

CREATE MATERIALIZED VIEW public.leaderboard AS
SELECT
    d.id                            AS donor_id,
    p.full_name,
    p.username,
    p.avatar_url,
    d.blood_group,
    d.total_donations,
    d.current_streak,
    d.longest_streak,
    d.last_donation_at,
    RANK() OVER (ORDER BY d.total_donations DESC, d.current_streak DESC) AS rank_overall,
    RANK() OVER (PARTITION BY d.blood_group ORDER BY d.total_donations DESC) AS rank_by_blood_group
FROM public.donors d
JOIN public.profiles p ON p.id = d.user_id
WHERE d.total_donations > 0
WITH DATA;

CREATE UNIQUE INDEX idx_leaderboard_donor_id ON public.leaderboard(donor_id);

-- =============================================================================
-- 6. INDEX OPTIMIZATION TUNING
-- =============================================================================
CREATE INDEX idx_profiles_location ON public.profiles USING GIST(location);
CREATE INDEX idx_donation_requests_hospital_location ON public.donation_requests USING GIST(hospital_location);
CREATE INDEX idx_donors_blood_group ON public.donors(blood_group);
CREATE INDEX idx_donors_is_available ON public.donors(is_available);
CREATE INDEX idx_donors_rest_period ON public.donors(rest_period_until);
CREATE INDEX idx_donation_requests_status ON public.donation_requests(status);
CREATE INDEX idx_donation_matches_status ON public.donation_matches(status);
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);

-- =============================================================================
-- 7. PL/PGSQL AUTOMATION & WORKLOAD ENGINES
-- =============================================================================

-- Updated_at Maintenance Boilerplate
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 18+ Age Verification Rules
CREATE OR REPLACE FUNCTION public.fn_validate_user_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth > (CURRENT_DATE - INTERVAL '18 years') THEN
        RAISE EXCEPTION 'Age Validation Failure: Registrants must be 18 years or older. DOB evaluated: %', NEW.date_of_birth;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cooldown Window Management
CREATE OR REPLACE FUNCTION public.fn_enforce_rest_period()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN

        UPDATE public.donors
        SET
            rest_period_until = NOW() + INTERVAL '4 months', -- Enforces 4-month rest period [cite: 12]
            last_donation_at  = NOW(),
            updated_at        = NOW()
        WHERE id = NEW.donor_id;

        UPDATE public.medical_documents
        SET status = 'expired'
        WHERE
            donor_id = NEW.donor_id
            AND status = 'approved'
            AND document_date < (CURRENT_DATE - INTERVAL '4 months'); -- Enforces 4-month doc expiration [cite: 64]

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Analytics Streaks Updates
CREATE OR REPLACE FUNCTION public.fn_update_donor_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_last_donation TIMESTAMPTZ;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    SELECT last_donation_at, current_streak, longest_streak
    INTO v_last_donation, v_current_streak, v_longest_streak
    FROM public.donors
    WHERE id = NEW.donor_id;

    IF v_last_donation IS NOT NULL AND v_last_donation >= NOW() - INTERVAL '6 months' THEN
        v_current_streak := v_current_streak + 1;
    ELSE
        v_current_streak := 1;
    END IF;

    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    UPDATE public.donors
    SET
        total_donations = total_donations + 1,
        current_streak  = v_current_streak,
        longest_streak  = v_longest_streak,
        updated_at      = NOW()
    WHERE id = NEW.donor_id;

    REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Immutable Allocation Core Writer
CREATE OR REPLACE FUNCTION public.fn_create_donation_record()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id   UUID;
    v_blood_group    public.blood_group;
    v_donor_location public.GEOGRAPHY(POINT, 4326);
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN

        SELECT r.blood_group, rec.id INTO v_blood_group, v_recipient_id
        FROM public.donation_requests r
        JOIN public.recipients rec ON rec.id = r.recipient_id
        WHERE r.id = NEW.request_id;

        SELECT p.location INTO v_donor_location
        FROM public.profiles p
        JOIN public.donors d ON d.user_id = p.id
        WHERE d.id = NEW.donor_id;

        INSERT INTO public.donations (
            match_id, donor_id, request_id, recipient_id, blood_group, donor_location
        ) VALUES (
            NEW.id, NEW.donor_id, NEW.request_id, v_recipient_id, v_blood_group, v_donor_location
        );

        UPDATE public.donation_requests
        SET
            units_fulfilled = units_fulfilled + 1,
            status = CASE
                WHEN units_fulfilled + 1 >= units_required THEN 'fulfilled'::public.donation_request_status
                ELSE 'in_progress'::public.donation_request_status
            END,
            updated_at = NOW()
        WHERE id = NEW.request_id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stale Cron Request Expirations 
CREATE OR REPLACE FUNCTION public.fn_expire_stale_requests()
RETURNS void AS $$
BEGIN
    UPDATE public.donation_requests
    SET status = 'expired', updated_at = NOW()
    WHERE
        status IN ('open', 'in_progress')
        AND required_by IS NOT NULL
        AND required_by < NOW();
END;
$$ LANGUAGE plpgsql;

-- Structural Eligibility Verification Check Rules
CREATE OR REPLACE FUNCTION public.fn_check_donor_eligibility(p_donor_id UUID)
RETURNS TABLE(is_eligible BOOLEAN, reason TEXT) AS $$
DECLARE
    v_donor             public.donors%ROWTYPE;
    v_doc_count         INTEGER;
    v_profile_active    BOOLEAN;
BEGIN
    SELECT * INTO v_donor FROM public.donors WHERE id = p_donor_id;

    SELECT is_active INTO v_profile_active FROM public.profiles WHERE id = v_donor.user_id;
    IF NOT v_profile_active THEN
         RETURN QUERY SELECT FALSE, 'Parent operational profile context is frozen/disabled.'::TEXT;
         RETURN;
    END IF;

    IF NOT v_donor.is_available THEN
        RETURN QUERY SELECT FALSE, 'Donor is toggled out of active availability pool.'::TEXT;
        RETURN;
    END IF;

    IF v_donor.rest_period_until IS NOT NULL AND v_donor.rest_period_until > NOW() THEN
        RETURN QUERY SELECT FALSE, FORMAT('Donor is within safety recovery window until %s.', v_donor.rest_period_until::TEXT);
        RETURN;
    END IF;

    IF NOT v_donor.is_platform_verified THEN
        RETURN QUERY SELECT FALSE, 'Donor platform verification requirements missing.'::TEXT;
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_doc_count
    FROM public.medical_documents
    WHERE
        donor_id    = p_donor_id
        AND status  = 'approved'
        AND document_date >= (CURRENT_DATE - INTERVAL '4 months');

    IF v_doc_count = 0 THEN
        RETURN QUERY SELECT FALSE, 'No active fresh documents found (dated <= 4 months).'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'Eligible.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Spatial Search Evaluation
CREATE OR REPLACE FUNCTION public.fn_find_eligible_donors(
    p_request_id        UUID,
    p_radius_km         NUMERIC DEFAULT 10
)
RETURNS TABLE (
    donor_id            UUID,
    user_id             UUID,
    full_name           TEXT,
    username            TEXT,
    blood_group         public.blood_group,
    distance_km         NUMERIC,
    total_donations     INTEGER,
    current_streak      INTEGER
) AS $$
DECLARE
    v_hospital_location public.GEOGRAPHY;
    v_blood_group       public.blood_group;
BEGIN
    SELECT hospital_location, blood_group INTO v_hospital_location, v_blood_group
    FROM public.donation_requests WHERE id = p_request_id;

    RETURN QUERY
    SELECT
        d.id                                                                      AS donor_id,
        p.id                                                                      AS user_id,
        p.full_name,
        p.username,
        d.blood_group,
        ROUND((public.ST_Distance(p.location, v_hospital_location) / 1000)::NUMERIC, 2)  AS distance_km,
        d.total_donations,
        d.current_streak
    FROM public.donors d
    JOIN public.profiles p ON p.id = d.user_id
    WHERE
        d.blood_group           = v_blood_group
        AND d.is_available      = TRUE
        AND d.is_platform_verified = TRUE
        AND (d.rest_period_until IS NULL OR d.rest_period_until < NOW())
        AND public.ST_DWithin(p.location, v_hospital_location, p_radius_km * 1000)
        AND d.id NOT IN (
            SELECT dm.donor_id FROM public.donation_matches dm
            WHERE dm.request_id = p_request_id AND dm.status NOT IN ('rejected', 'withdrawn', 'no_show')
        )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Sequential Cursor-Based Cascades
CREATE OR REPLACE PROCEDURE public.execute_cascading_alerts(
    p_request_id UUID,
    p_max_distance_km NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
    cur_proximity_donors CURSOR(req_id UUID, max_dist NUMERIC) FOR 
        SELECT fed.donor_id, fed.distance_km FROM public.fn_find_eligible_donors(req_id, max_dist) fed
        ORDER BY fed.distance_km ASC;
    v_donor_id UUID;
    v_distance NUMERIC;
BEGIN
    OPEN cur_proximity_donors(p_request_id, p_max_distance_km);
    FETCH cur_proximity_donors INTO v_donor_id, v_distance;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No open candidates inside perimeter radius of % km.', p_max_distance_km;
    ELSE
        INSERT INTO public.donation_matches (request_id, donor_id, status) VALUES (p_request_id, v_donor_id, 'pending');
        RAISE NOTICE 'Notification dispatched to Donor: % at Distance radius: % km.', v_donor_id, v_distance;
    END IF;
    CLOSE cur_proximity_donors;
END;
$$;

-- =============================================================================
-- 8. TRIGGER CONFIGURATIONS
-- =============================================================================
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_donors_updated_at BEFORE UPDATE ON public.donors FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_recipients_updated_at BEFORE UPDATE ON public.recipients FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_donation_requests_updated_at BEFORE UPDATE ON public.donation_requests FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_validate_profile_age BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_validate_user_age();
CREATE TRIGGER trg_enforce_rest_period AFTER UPDATE ON public.donation_matches FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_rest_period();
CREATE TRIGGER trg_update_donor_stats AFTER INSERT ON public.donations FOR EACH ROW EXECUTE FUNCTION public.fn_update_donor_stats();
CREATE TRIGGER trg_create_donation_record AFTER UPDATE ON public.donation_matches FOR EACH ROW EXECUTE FUNCTION public.fn_create_donation_record();