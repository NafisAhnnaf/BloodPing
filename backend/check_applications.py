"""Helper script to inspect the latest donor applications in the database.
Run with:
    python check_applications.py
"""
import sys
from app.database import init_db_pool, get_db_connection

def check_latest_applications(limit: int = 5):
    init_db_pool()
    with get_db_connection() as db:
        with db.cursor() as cur:
            cur.execute("""
                SELECT 
                    da.id AS application_id,
                    p.full_name,
                    da.blood_group,
                    da.travel_radius_km,
                    da.status,
                    da.rejection_reason,
                    da.document_url,
                    da.created_at
                FROM public.donor_applications da
                LEFT JOIN public.profiles p ON p.id = da.user_id
                ORDER BY da.created_at DESC
                LIMIT %s;
            """, (limit,))
            rows = cur.fetchall()

            if not rows:
                print("\n[!] No donor applications found in the database yet.\n")
                return

            print("\n" + "=" * 90)
            print(f"{'LATEST DONOR APPLICATIONS IN DATABASE':^90}")
            print("=" * 90)

            for idx, r in enumerate(rows, 1):
                print(f"\n--- Application #{idx} ---")
                print(f"  Application ID : {r['application_id']}")
                print(f"  Applicant Name : {r['full_name'] or 'N/A'}")
                print(f"  Blood Group    : {r['blood_group']}")
                print(f"  Travel Radius  : {r['travel_radius_km']} km")
                print(f"  Status         : {r['status'].upper()}")
                if r['rejection_reason']:
                    print(f"  Reject Reason  : {r['rejection_reason']}")
                print(f"  Submitted At   : {r['created_at']}")
                print(f"  Document URL   : {r['document_url']}")

            print("\n" + "=" * 90 + "\n")

if __name__ == '__main__':
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    check_latest_applications(limit)
