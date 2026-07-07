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