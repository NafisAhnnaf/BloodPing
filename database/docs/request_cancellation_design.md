# Request Cancellation Design & Edge Cases

## The "Orphaned Donors" Problem
When a recipient cancels a `donation_request` (e.g., they found blood elsewhere), the request's `status` becomes `'cancelled'`. 

However, there may be donors sitting in the `donation_matches` table who have already applied to this request and are currently in a `'pending'` or `'accepted'` state. 

### Current Implementation (Option 1 - Implicit Route)
Currently, the `cancel_request.sql` procedure **does not** touch the `donation_matches` table. 
*   **Database:** The match status remains `'pending'` or `'accepted'`.
*   **Frontend Requirement:** The frontend must implicitly determine that these matches are voided by checking the parent request. Logic: `if (request.status === 'cancelled') { // Show donor that the request was closed }`

### Future Discussion (Option 2 - The Clean Route)
To keep the database analytics pristine and avoid confusing a "Donor Withdrawal" with a "Recipient Cancellation", we may want to revisit this later.
*   **Proposed Change:** Add a new ENUM value `'request_cancelled'` to `public.donation_match_status`.
*   **Procedure Update:** Modify `cancel_request.sql` to automatically cascade an update to `donation_matches`, changing any `'pending'` or `'accepted'` matches for that request to `'request_cancelled'`.

*Documented on: July 26, 2026*
