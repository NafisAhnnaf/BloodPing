"""
Helper script to reset Ananta's application back to pending for live UI testing.
Usage: python reset_application.py
"""
from app.database import init_db_pool, get_db_connection

ANANTA_ID = "aed9a88d-5f32-4e09-be5d-6c7612fe6d92"
APPLICATION_ID = "91ee4c1a-d39f-48cc-8704-9cb507844abe"

def reset():
    init_db_pool()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Reset application status to pending
            cur.execute(
                """
                UPDATE public.donor_applications
                SET status = 'pending',
                    reviewed_by = NULL,
                    reviewed_at = NULL,
                    rejection_reason = NULL,
                    updated_at = NOW()
                WHERE id = %s;
                """,
                (APPLICATION_ID,)
            )

            # 2. Remove donor profile record
            cur.execute("DELETE FROM public.donors WHERE user_id = %s;", (ANANTA_ID,))

            # 3. Clean up approval notifications for clean re-test
            cur.execute(
                """
                DELETE FROM public.notifications 
                WHERE user_id = %s AND type IN ('application_approved', 'application_rejected');
                """,
                (ANANTA_ID,)
            )

        conn.commit()
    print("SUCCESS: Ananta application reset back to 'pending' state.")
    print(" - public.donor_applications: status = 'pending'")
    print(" - public.donors: record removed")
    print(" - public.notifications: approval notifications cleared")

if __name__ == "__main__":
    reset()
