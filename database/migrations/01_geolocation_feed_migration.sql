-- =============================================================================
-- MIGRATION: 01_geolocation_feed_migration.sql
-- Description: Adds user_locations table with GiST spatial indexing,
--              upsert_user_location procedure, calculate_haversine_distance function,
--              and get_personalized_feed function.
-- =============================================================================

-- 1. Create public.user_locations table
CREATE TABLE IF NOT EXISTS public.user_locations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label               TEXT NOT NULL DEFAULT 'Primary',
    location            public.GEOGRAPHY(POINT, 4326) NOT NULL,
    location_name       TEXT,
    source              TEXT NOT NULL DEFAULT 'browser_gps',
    accuracy_meters     DOUBLE PRECISION,
    is_primary          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Spatial and relational indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_spatial 
ON public.user_locations USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_user_locations_user 
ON public.user_locations(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_location 
ON public.user_locations(user_id) 
WHERE (is_primary = TRUE);
