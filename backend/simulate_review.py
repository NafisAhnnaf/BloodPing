"""Helper script to simulate admin approval or rejection of a donor application.

Usage:
    python simulate_review.py approve <application_id>
    python simulate_review.py reject <application_id> "Reason for rejection"

Or without arguments, it will automatically review the latest pending application!
"""
import sys
from app.database import init_db_pool, get_db_connection

def simulate(action: str = 'approve', app_id: str = None, reason: str = None):
    init_db_pool()
    with get_db_connection() as db:
        with db.cursor() as cur:
            # If no app_id provided, find the latest pending application
            if not app_id:
                cur.execute("""
                    SELECT id, user_id, blood_group 
                    FROM public.donor_applications 
                    WHERE status = 'pending' 
                    ORDER BY created_at DESC 
                    LIMIT 1;
                """)
                row = cur.fetchone()
                if not row:
                    print("\n[!] No pending applications found to review.\n")
                    return
                app_id = str(row['id'])
                user_id = str(row['user_id'])
                print(f"Found latest pending application: {app_id} (User: {user_id}, Blood Group: {row['blood_group']})")
            else:
                cur.execute("SELECT user_id FROM public.donor_applications WHERE id = %s;", (app_id,))
                row = cur.fetchone()
                if not row:
                    print(f"\n[!] Application {app_id} not found.\n")
                    return
                user_id = str(row['user_id'])

            if action.lower() == 'approve':
                # Direct SQL review
                cur.execute("""
                    UPDATE public.donor_applications
                    SET status = 'approved',
                        reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s;

                    INSERT INTO public.donors (user_id, blood_group, travel_radius_km)
                    SELECT user_id, blood_group, travel_radius_km
                    FROM public.donor_applications
                    WHERE id = %s
                    ON CONFLICT (user_id) DO UPDATE SET
                        blood_group = EXCLUDED.blood_group,
                        travel_radius_km = EXCLUDED.travel_radius_km,
                        updated_at = NOW();
                """, (app_id, app_id))
                db.commit()
                print(f"\n[SUCCESS] Application {app_id} has been APPROVED!")
                print("The user has been added to public.donors. Refresh your browser to see the Verified Donor badge!\n")

            elif action.lower() == 'reject':
                reject_reason = reason or "Medical clearance certificate was unreadable, blurry, or expired."
                cur.execute("""
                    UPDATE public.donor_applications
                    SET status = 'rejected',
                        rejection_reason = %s,
                        reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s;

                    DELETE FROM public.donors WHERE user_id = %s;
                """, (reject_reason, app_id, user_id))
                db.commit()
                print(f"\n[SUCCESS] Application {app_id} has been REJECTED!")
                print(f"Reason: {reject_reason}")
                print("Refresh your browser to see the Verification Failed screen and re-apply button!\n")
            else:
                print(f"Unknown action: {action}. Use 'approve' or 'reject'.")

if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else 'approve'
    app_id = sys.argv[2] if len(sys.argv) > 2 else None
    reason = sys.argv[3] if len(sys.argv) > 3 else None
    simulate(action, app_id, reason)
