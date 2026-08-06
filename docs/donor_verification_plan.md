# Project Docs: Donor Verification & Admin Approval System

This document describes the modular architecture, database transitions, and API configurations for the donor candidate application and admin review pipeline.

---

## 1. Modular Architecture Layout (Backend)

To keep code decoupled and modular, the functionality will be divided into specific routers and services:

```
backend/app/
├── routers/
│   ├── donor_router.py      # Route: /donors/*
│   ├── recipient_router.py  # Route: /recipients/*
│   └── admin_router.py      # Route: /admins/*
└── services/
    ├── donor_service.py     # Donor verification queries & application logic
    ├── recipient_service.py # Recipient validation and streaks
    └── admin_service.py     # Admin dashboards and application reviews
```

### Route & Service Specifications

#### A. Donor Module (`/donors`)
* **`POST /donors/apply`**: Submit a new verification application with a medical certificate/blood report and preferred radius.
* **`GET /donors/status`**: Fetch the current logged-in user's application history/status.
* **Service (`donor_service.py`)**: Resolves candidate files, checks status, and interacts with the database for user applications.

#### B. Recipient Module (`/recipients`)
* **`GET /recipients/me`**: Fetch active recipient state.
* **Service (`recipient_service.py`)**: Manages recipient metadata and requesting privileges.

#### C. Admin Module (`/admins`)
* **`GET /admins/applications`**: Retrieves list of pending/reviewed donor applications.
* **`POST /admins/applications/{id}/review`**: Approves or rejects a specific application with review logs.
* **Service (`admin_service.py`)**: Executes administrative audits and triggers application reviews.

---

## 2. Donor Info Database Transfer (How & When)

### When is data transferred?
The data is transferred **instantly and atomically** inside a single database transaction when an administrator calls the review endpoint (`POST /admins/applications/{id}/review`) and sets the status to `'approved'`.

### How is data transferred?
To maintain the **Fat-Database Architecture**, the data copying is delegated to a PL/pgSQL function:

1. The `admin_service.py` executes a database cursor calling:
   ```sql
   SELECT public.review_donor_application(p_application_id, p_admin_id, 'approved');
   ```
2. The database function performs the following steps inside a transaction block:
   * Verifies that `p_admin_id` exists in the `public.admins` registry.
   * Fetches the candidate user's ID, selected blood group, and travel radius from the corresponding `donor_applications` table row.
   * Executes a relational copy operation into `public.donors`:
     ```sql
     INSERT INTO public.donors (user_id, blood_group, travel_radius_km)
     VALUES (v_user_id, v_blood_group, v_travel_radius)
     ON CONFLICT (user_id) DO UPDATE SET
         blood_group = EXCLUDED.blood_group,
         travel_radius_km = EXCLUDED.travel_radius_km,
         updated_at = NOW();
     ```
   * Updates the application row status to `'approved'`, noting the reviewer and review timestamp.
3. This guarantees that **a user only becomes a verified donor once approved by an admin**, and their details are kept synchronized between the application log and the active donor directory.

---

## 3. Database Schema Changes

### A. Core Table
```sql
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.donor_applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_group         public.blood_group NOT NULL,
    travel_radius_km    NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    document_url        TEXT NOT NULL, -- Path to file in Supabase storage bucket
    status              public.application_status NOT NULL DEFAULT 'pending',
    rejection_reason    TEXT,
    reviewed_by         UUID REFERENCES public.profiles(id),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX donor_apps_user_idx ON public.donor_applications(user_id);
CREATE INDEX donor_apps_status_idx ON public.donor_applications(status);
```

### B. PL/pgSQL Routines

```sql
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
```

```sql
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
    IF NOT EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = p_admin_id
    ) THEN
        RAISE EXCEPTION 'Only platform administrators can review donor applications.';
    END IF;

    SELECT user_id, blood_group, travel_radius_km
    INTO v_user_id, v_blood_group, v_travel_radius
    FROM public.donor_applications
    WHERE id = p_application_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor application not found.';
    END IF;

    UPDATE public.donor_applications
    SET status = p_status::public.application_status,
        rejection_reason = p_rejection_reason,
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_application_id;

    IF p_status = 'approved' THEN
        INSERT INTO public.donors (user_id, blood_group, travel_radius_km)
        VALUES (v_user_id, v_blood_group, v_travel_radius)
        ON CONFLICT (user_id) DO UPDATE SET
            blood_group = EXCLUDED.blood_group,
            travel_radius_km = EXCLUDED.travel_radius_km,
            updated_at = NOW();
    END IF;
END;
$$;
```

---

## 4. UI/UX Design Coherence
* **Aesthetic**: The Admin Dashboard will share the identical premium glassmorphic visual language used throughout the application, featuring a dark/vibrant gradient background, high-contrast typography, and smooth, responsive interactive states.
* **Badges**: Users approved as donors will render a custom verified icon next to their profile avatar on both the Map Search and Leaderboard screens.
