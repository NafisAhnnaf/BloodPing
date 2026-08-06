import os
import psycopg2
from dotenv import load_dotenv

# Load env variables from backend/.env
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/.env'))
load_dotenv(dotenv_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL is not set!")
    exit(1)

try:
    print(f"Connecting to database...")
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    # 1. Create enum application_status and donor_applications table if not exists
    print("Creating type and tables...")
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
                CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
            END IF;
        END$$;
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS public.donor_applications (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            blood_group         public.blood_group NOT NULL,
            travel_radius_km    NUMERIC(5,2) NOT NULL DEFAULT 10.0,
            document_url        TEXT NOT NULL,
            status              public.application_status NOT NULL DEFAULT 'pending',
            rejection_reason    TEXT,
            reviewed_by         UUID REFERENCES public.profiles(id),
            reviewed_at         TIMESTAMPTZ,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_donor_apps_user ON public.donor_applications(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_donor_apps_status ON public.donor_applications(status);")

    # 2. Load and create functions from files
    functions_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'plpgsql/functions'))
    for filename in sorted(os.listdir(functions_dir)):
        if filename.endswith(".sql"):
            filepath = os.path.join(functions_dir, filename)
            print(f"Applying function from file: {filename}")
            with open(filepath, 'r') as f:
                sql = f.read()
                cursor.execute(sql)

    conn.commit()
    print("Migration executed successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Migration failed: {e}")
    exit(1)
