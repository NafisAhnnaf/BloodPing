from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    """Initializes and returns a callable Supabase client using settings.
    
    This is independent and can be imported as a singleton or invoked directly.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_ANON_KEY must be configured in environment."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Singleton instance of the Supabase Client
supabase: Client = get_supabase_client()
