# BloodPing Project Context

## 1. Project Overview
**BloodPing** is a Social Media Platform designed specifically for Blood Donations. It connects blood recipients with willing donors. The project is heavily database-driven (database-first approach) as part of a DBMS-II curriculum, meaning the vast majority of business logic, constraints, and geographic calculations will reside directly within the PostgreSQL database using **PL/pgSQL**.

## 2. Tech Stack
*   **Database, Auth & Storage:** Supabase (PostgreSQL, PostGIS, Supabase Auth, Supabase Storage).
*   **Backend:** FastAPI (Python).
*   **Frontend:** React (Vite SPA).
*   **UI/UX Design:** Initially generated via Stitch AI.
*   **Frontend Libraries:** `framer-motion` (animations), `lucide-react` (icons), `zustand` with persist (state management), `axios` with a custom wrapper for attaching Bearer Tokens.

## 3. Core Architectural Principles
*   **Database First:** All heavy lifting is offloaded to the database. FastAPI serves mainly as a secure routing layer to call PL/pgSQL functions and procedures.
*   **Backend Error Handling:** Every router function in FastAPI MUST be wrapped inside a `try-except` block.
*   **Standardized HTTP Response Structure:**
    *   **Success:** `{ success: true, code: 200, payload: {}, message: "" }`
    *   **Error:** `{ success: false, code: 500, message: "" }`

## 4. Key Entities and Database Schema Concepts
*   **Users & Roles:** 
    *   Base user table extends Supabase's `auth.users`.
    *   Users can toggle between roles. To support this, `donors` and `recipients` are separate tables that inherit/reference the base user table via foreign keys.
*   **Session Management:** 
    *   User sessions will store the user's IP address (using PostgreSQL's `inet` type) and MAC address (using the `macaddr` type) for geolocation and tracking purposes.
*   **Medical Records:** 
    *   Physical documents are stored in Supabase Storage.
    *   Structured medical data is kept in the DB.
    *   *Constraint:* Documents must be **4 months old or newer**. If older, the donor must update them before accepting new requests.
    *   *Verification:* Done strictly by the recipient (peer-to-peer social media style), not by a central admin.
    *   *Future Scope:* OCR integration via AI APIs to auto-populate DB fields from uploaded medical documents.

## 5. Social & Core Features
*   **Donation Requests:** Recipients create requests; donors can view, filter, and accept them.
*   **Geolocation:** Implemented using **PostGIS** in Supabase for location-based donor search and radius filtering.
*   **Rest Period:** Donors are strictly enforced into a **4-month rest period** after a successful donation via database triggers.
*   **Gamification:** The system tracks and calculates **streaks** and **total donations** for donors, which populate community **leaderboards**.
